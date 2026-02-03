"""ML model loading and inference utilities."""
import os
import re
from typing import Optional, Tuple, List
from functools import lru_cache
import logging

import joblib
import numpy as np

logger = logging.getLogger(__name__)

# =============================================================================
# ANTI-LEAKAGE: STOP SEQUENCES & FORBIDDEN PATTERNS
# =============================================================================
# These prevent the model from outputting internal thoughts/reasoning

STOP_SEQUENCES = [
    # Common thought markers
    "Thought:",
    "Thinking:",
    "Internal:",
    "Reasoning:",
    "Analysis:",
    "Planning:",
    "Step 1:",
    "Step 2:",
    "Let me think",
    "I need to consider",
    "First, I should",
    "My reasoning:",
    "To answer this",
    "Breaking this down",
    # XML-style tags
    "<thought>",
    "<thinking>",
    "<reasoning>",
    "<internal>",
    "<scratchpad>",
    "<analysis>",
    "<reflection>",
    "<chain-of-thought>",
    "<cot>",
    # Markdown markers
    "**Thought:**",
    "**Thinking:**",
    "**Reasoning:**",
    "**Internal:**",
    # Bracket markers
    "[Thought]",
    "[Internal]",
    "[Reasoning]",
]

# Patterns to remove in post-processing
POST_PROCESS_PATTERNS = [
    r'<thought>.*?</thought>',
    r'<thinking>.*?</thinking>',
    r'<reasoning>.*?</reasoning>',
    r'<internal>.*?</internal>',
    r'<scratchpad>.*?</scratchpad>',
    r'<analysis>.*?</analysis>',
    r'\*\*Thought:\*\*.*?(?=\n\n|$)',
    r'\*\*Thinking:\*\*.*?(?=\n\n|$)',
    r'\*\*Reasoning:\*\*.*?(?=\n\n|$)',
    r'^Thought:.*$',
    r'^Thinking:.*$',
    r'^Let me think.*?(?=\n\n|$)',
    r'^I need to consider.*?(?=\n\n|$)',
    r'^Step \d+:.*$',
    r'\[Thought\].*?\[/Thought\]',
    r'\[Internal\].*?\[/Internal\]',
]

# Strict system prompt that forbids internal monologue output
ANTI_LEAKAGE_SYSTEM_PROMPT = """You are Toki, a friendly and helpful AI tutor for children and students.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. NEVER output your internal thoughts, reasoning, or planning
2. NEVER use tags like <thought>, <thinking>, <reasoning>, <internal>, or similar
3. NEVER write "Thought:", "Thinking:", "Let me think...", "Step 1:", or similar prefixes
4. NEVER show chain-of-thought or step-by-step reasoning to the user
5. ONLY provide the final, polished response that directly answers the user
6. Be warm, encouraging, and age-appropriate in your responses
7. Use simple language suitable for the student's level
8. If you don't know something, say so honestly

Your response should ONLY contain the helpful answer - nothing else."""


def clean_response(text: str) -> str:
    """Remove any leaked thought/reasoning patterns from model output."""
    if not isinstance(text, str):
        return str(text) if text else ""
    
    # Remove stop sequences if they appear
    for stop_seq in STOP_SEQUENCES:
        if stop_seq.lower() in text.lower():
            idx = text.lower().find(stop_seq.lower())
            text = text[:idx]
    
    # Apply regex patterns to clean remaining issues
    for pattern in POST_PROCESS_PATTERNS:
        text = re.sub(pattern, '', text, flags=re.DOTALL | re.MULTILINE | re.IGNORECASE)
    
    # Clean up whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'  +', ' ', text)
    
    return text.strip()

# Global model instances
_policy_model = None
_phi3_model = None  # Will be Llama instance for GGUF model
_phi3_tokenizer = None

# Response cache for common questions (LRU cache)
from functools import lru_cache
import hashlib

# Simple in-memory cache for responses
_response_cache = {}
_cache_max_size = 100

def _get_cache_key(instruction: str, question: str) -> str:
    """Generate cache key from instruction and question."""
    content = f"{instruction}:{question}".lower().strip()
    return hashlib.md5(content.encode()).hexdigest()

def _cache_response(key: str, response: str):
    """Cache a response, evicting oldest if full."""
    global _response_cache
    if len(_response_cache) >= _cache_max_size:
        # Remove oldest entry (first key)
        oldest = next(iter(_response_cache))
        del _response_cache[oldest]
    _response_cache[key] = response

def _get_cached_response(key: str) -> Optional[str]:
    """Get cached response if available."""
    return _response_cache.get(key)


def load_policy_model(model_path: str):
    """Load the ML policy model from disk."""
    global _policy_model
    
    if not os.path.exists(model_path):
        logger.warning(f"Policy model not found at {model_path}. Using fallback strategy.")
        return None
    
    try:
        _policy_model = joblib.load(model_path)
        logger.info(f"Policy model loaded from {model_path}")
        return _policy_model
    except Exception as e:
        logger.error(f"Failed to load policy model: {e}")
        return None


def predict_strategy(
    grade: int,
    mistakes: int,
    time_spent: int,
    frustration: int,
    recent_accuracy: float
) -> str:
    """Predict tutoring strategy using the ML model."""
    global _policy_model
    
    # Strategy mapping
    strategies = [
        "scaffolding",        # Break down into smaller steps
        "socratic",           # Ask guiding questions
        "direct_instruction", # Explain concept clearly
        "encouragement",      # Provide emotional support
        "practice",           # More practice problems
        "visual",             # Use diagrams/visualizations
        "analogies",          # Use real-world analogies
        "review"              # Review prerequisites
    ]
    
    if _policy_model is None:
        # Fallback: rule-based strategy selection
        if frustration > 7:
            return "encouragement"
        elif recent_accuracy < 0.3:
            return "review"
        elif mistakes > 3:
            return "scaffolding"
        elif time_spent > 300:  # 5 minutes stuck
            return "direct_instruction"
        else:
            return "socratic"
    
    try:
        # Prepare features for prediction
        features = np.array([[grade, mistakes, time_spent, frustration, recent_accuracy]])
        
        # Predict strategy index
        prediction = _policy_model.predict(features)
        
        # Handle different model output types
        if isinstance(prediction[0], (int, np.integer)):
            strategy_idx = int(prediction[0])
            if 0 <= strategy_idx < len(strategies):
                return strategies[strategy_idx]
        elif isinstance(prediction[0], str):
            return prediction[0]
        
        return "socratic"  # Default fallback
        
    except Exception as e:
        logger.error(f"Strategy prediction failed: {e}")
        return "socratic"


def load_phi3_model(model_path: str, lora_path: Optional[str] = None):
    """Load Phi-3 GGUF model using llama-cpp-python for fast CPU/GPU inference."""
    global _phi3_model
    
    # Check for GGUF model first (preferred for speed)
    gguf_path = "./models/Phi-3-mini-4k-instruct-q4.gguf"
    
    if os.path.exists(gguf_path):
        try:
            from llama_cpp import Llama
            import multiprocessing
            
            logger.info(f"Loading quantized Phi-3 from {gguf_path}...")
            
            # Detect optimal thread count (use physical cores, not hyperthreads)
            cpu_count = multiprocessing.cpu_count()
            optimal_threads = max(4, cpu_count // 2)  # Use half of logical cores
            
            # Check if CUDA is available for GPU acceleration
            n_gpu = 0
            try:
                import torch
                if torch.cuda.is_available():
                    n_gpu = 35  # Offload ~35 layers to GPU (Phi-3-mini has 32 layers)
                    logger.info(f"CUDA detected! Offloading {n_gpu} layers to GPU")
            except ImportError:
                pass
            
            # Load the GGUF model with optimized settings
            _phi3_model = Llama(
                model_path=gguf_path,
                n_ctx=2048,           # Reduced context (faster, still enough for tutoring)
                n_threads=optimal_threads,  # Use optimal CPU threads
                n_gpu_layers=n_gpu,   # GPU offloading if available
                n_batch=512,          # Batch size for prompt processing (higher = faster)
                use_mlock=True,       # Lock model in RAM (prevents swapping)
                use_mmap=True,        # Memory-mapped loading (faster startup)
                verbose=False
            )
            
            logger.info(f"✓ Phi-3 GGUF model loaded (threads={optimal_threads}, gpu_layers={n_gpu})")
            return _phi3_model, None
            
        except ImportError:
            logger.error("llama-cpp-python not installed. Run: pip install llama-cpp-python")
            return None, None
        except Exception as e:
            logger.error(f"Failed to load GGUF model: {e}")
            return None, None
    
    # Fallback: try loading with transformers (slower)
    logger.warning(f"GGUF model not found at {gguf_path}. Trying transformers...")
    
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel
        import torch
        
        global _phi3_tokenizer
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading Phi-3 with transformers on {device}")
        
        _phi3_tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            trust_remote_code=True
        )
        
        _phi3_model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto" if device == "cuda" else None,
            trust_remote_code=True
        )
        
        if lora_path and os.path.exists(lora_path):
            logger.info(f"Loading LoRA adapter from {lora_path}")
            _phi3_model = PeftModel.from_pretrained(_phi3_model, lora_path)
        
        if device == "cpu":
            _phi3_model = _phi3_model.to(device)
        
        logger.info("Phi-3 model loaded successfully")
        return _phi3_model, _phi3_tokenizer
        
    except ImportError as e:
        logger.error(f"Missing dependencies for Phi-3: {e}")
        return None, None
    except Exception as e:
        logger.error(f"Failed to load Phi-3: {e}")
        return None, None


def generate_tutor_response(
    instruction: str,
    question: str,
    max_new_tokens: int = 256  # Reduced from 512 for faster responses
) -> str:
    """Generate a tutoring response using Phi-3 with anti-leakage measures."""
    global _phi3_model, _phi3_tokenizer
    
    # Check cache first for speed
    cache_key = _get_cache_key(instruction, question)
    cached = _get_cached_response(cache_key)
    if cached:
        logger.debug("Cache hit for tutor response")
        return cached
    
    if _phi3_model is None:
        return generate_fallback_response(instruction, question)
    
    # Check if using llama-cpp (GGUF model)
    try:
        from llama_cpp import Llama
        if isinstance(_phi3_model, Llama):
            response = generate_with_llama_cpp(instruction, question, max_new_tokens)
            _cache_response(cache_key, response)
            return response
    except ImportError:
        pass
    
    # Using transformers
    if _phi3_tokenizer is None:
        return generate_fallback_response(instruction, question)
    
    try:
        import torch
        from transformers import StoppingCriteria, StoppingCriteriaList
        
        # Combine anti-leakage system prompt with instruction
        full_system = f"{ANTI_LEAKAGE_SYSTEM_PROMPT}\n\n{instruction}"
        
        prompt = f"""<|system|>
{full_system}
<|end|>
<|user|>
{question}
<|end|>
<|assistant|>
"""
        
        inputs = _phi3_tokenizer(prompt, return_tensors="pt")
        inputs = {k: v.to(_phi3_model.device) for k, v in inputs.items()}
        input_length = inputs["input_ids"].shape[1]
        
        # Create stopping criteria for forbidden sequences
        class StopOnBadTokens(StoppingCriteria):
            def __init__(self, stop_strings, tokenizer, start_length):
                self.stop_strings = [s.lower() for s in stop_strings]
                self.tokenizer = tokenizer
                self.start_length = start_length
            
            def __call__(self, input_ids, scores, **kwargs):
                generated = self.tokenizer.decode(
                    input_ids[0, self.start_length:], 
                    skip_special_tokens=True
                ).lower()
                for stop in self.stop_strings:
                    if stop in generated:
                        logger.warning(f"Stopped generation: detected '{stop}'")
                        return True
                return False
        
        stopping_criteria = StoppingCriteriaList([
            StopOnBadTokens(STOP_SEQUENCES, _phi3_tokenizer, input_length)
        ])
        
        with torch.no_grad():
            outputs = _phi3_model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                repetition_penalty=1.1,
                pad_token_id=_phi3_tokenizer.eos_token_id,
                stopping_criteria=stopping_criteria
            )
        
        response = _phi3_tokenizer.decode(
            outputs[0][input_length:],
            skip_special_tokens=True
        )
        
        # Post-process to remove any leaked content
        response = clean_response(response)
        
        return response
        
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return generate_fallback_response(instruction, question)


def generate_with_llama_cpp(instruction: str, question: str, max_tokens: int = 256) -> str:
    """Generate response using llama-cpp-python (GGUF model) with speed optimizations."""
    global _phi3_model
    
    try:
        # Combine anti-leakage system prompt with instruction
        full_system = f"{ANTI_LEAKAGE_SYSTEM_PROMPT}\n\n{instruction}"
        
        # Phi-3 chat format
        prompt = f"""<|system|>
{full_system}
<|end|>
<|user|>
{question}
<|end|>
<|assistant|>
"""
        
        # Minimal stop sequences for speed (most important ones only)
        stop_tokens = [
            "<|end|>", "<|user|>",
            "Thought:", "<thought>", "Let me think",
        ]
        
        # Generate response with speed-optimized settings
        output = _phi3_model(
            prompt,
            max_tokens=max_tokens,
            temperature=0.6,       # Slightly lower = faster convergence
            top_p=0.85,            # Slightly lower = fewer candidates
            top_k=40,              # Limit candidates (faster sampling)
            repeat_penalty=1.1,
            stop=stop_tokens,
            echo=False
        )
        
        response = output["choices"][0]["text"].strip()
        
        # Post-process to remove any leaked content
        response = clean_response(response)
        
        return response
        
    except Exception as e:
        logger.error(f"llama-cpp generation failed: {e}")
        return generate_fallback_response(instruction, question)


def generate_tutor_response_stream(instruction: str, question: str, max_tokens: int = 256):
    """
    Stream tutor response token by token for faster perceived response.
    Yields tokens as they're generated.
    """
    global _phi3_model
    
    if _phi3_model is None:
        # Fallback: yield entire response at once
        yield generate_fallback_response(instruction, question)
        return
    
    try:
        from llama_cpp import Llama
        if not isinstance(_phi3_model, Llama):
            # Transformers doesn't support easy streaming, fall back
            yield generate_tutor_response(instruction, question, max_tokens)
            return
    except ImportError:
        yield generate_tutor_response(instruction, question, max_tokens)
        return
    
    try:
        # Build prompt
        full_system = f"{ANTI_LEAKAGE_SYSTEM_PROMPT}\n\n{instruction}"
        prompt = f"""<|system|>
{full_system}
<|end|>
<|user|>
{question}
<|end|>
<|assistant|>
"""
        
        stop_tokens = ["<|end|>", "<|user|>", "Thought:", "<thought>"]
        
        # Stream tokens
        accumulated = ""
        for output in _phi3_model(
            prompt,
            max_tokens=max_tokens,
            temperature=0.6,
            top_p=0.85,
            top_k=40,
            repeat_penalty=1.1,
            stop=stop_tokens,
            echo=False,
            stream=True  # Enable streaming
        ):
            token = output["choices"][0]["text"]
            accumulated += token
            
            # Check for leakage markers in accumulated text
            should_stop = False
            for marker in ["Thought:", "<thought>", "Let me think"]:
                if marker.lower() in accumulated.lower():
                    should_stop = True
                    break
            
            if should_stop:
                break
            
            yield token
        
    except Exception as e:
        logger.error(f"Streaming generation failed: {e}")
        yield generate_fallback_response(instruction, question)


def generate_fallback_response(instruction: str, question: str) -> str:
    """Generate a fallback response with static templates."""
    # Static fallback responses
    if "scaffolding" in instruction.lower():
        return f"Let's break this down step by step. What's the first thing you notice about this problem: {question[:100]}...?"
    elif "encouragement" in instruction.lower():
        return "I can see you're working hard on this! Take a deep breath. Let's approach this together - what part feels most confusing?"
    elif "review" in instruction.lower():
        return "It seems like we should review some foundational concepts first. Can you tell me what you already know about this topic?"
    elif "direct_instruction" in instruction.lower():
        return "Let me explain the key concept here clearly, and then we'll work through it together. The main idea is..."
    elif "visual" in instruction.lower():
        return "This would be easier to understand with a visual. Imagine it like this..."
    elif "analogies" in instruction.lower():
        return "Think of it like this real-world example..."
    elif "practice" in instruction.lower():
        return "Let's try a simpler version of this problem first to build your confidence."
    else:
        return f"That's a great question! Before I help you with the answer, let me ask: what have you already tried?"

# Content generation for quizzes, flashcards, etc.
def generate_with_model(prompt: str, max_tokens: int = 1024) -> str:
    """Generate content using the loaded model (GGUF or transformers) with anti-leakage."""
    global _phi3_model, _phi3_tokenizer
    
    if _phi3_model is None:
        return ""
    
    # Build comprehensive stop sequences
    stop_tokens = [
        "<|end|>", "<|user|>", "<|system|>",
        "Thought:", "Thinking:", "Internal:", "Reasoning:",
        "<thought>", "<thinking>", "<reasoning>", "<internal>",
        "Let me think", "Step 1:", "My reasoning:",
    ]
    
    # Check if using llama-cpp (GGUF model)
    try:
        from llama_cpp import Llama
        if isinstance(_phi3_model, Llama):
            output = _phi3_model(
                prompt,
                max_tokens=max_tokens,
                temperature=0.7,
                top_p=0.9,
                repeat_penalty=1.1,
                stop=stop_tokens,
                echo=False
            )
            response = output["choices"][0]["text"].strip()
            return clean_response(response)
    except ImportError:
        pass
    
    # Using transformers
    if _phi3_tokenizer is None:
        return ""
    
    try:
        import torch
        
        inputs = _phi3_tokenizer(prompt, return_tensors="pt")
        inputs = {k: v.to(_phi3_model.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = _phi3_model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                do_sample=True,
                temperature=0.7,
                repetition_penalty=1.1,
            )
        
        response = _phi3_tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:],
            skip_special_tokens=True
        )
        return clean_response(response)
        
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return ""


def generate_quiz_questions(topic: str, num_questions: int, grade: int, material_content: str = None) -> list:
    """Generate quiz questions for a topic, optionally based on provided material content."""
    global _phi3_model
    import json
    import re
    
    # Build context from material if provided
    material_context = ""
    if material_content:
        # Truncate material to fit in context (max ~2000 chars for prompt)
        material_context = f"""
Based on the following study material:
---
{material_content[:2000]}
---
"""
    
    if _phi3_model is None:
        # Fallback: return sample questions based on topic
        return generate_fallback_quiz(topic, num_questions, material_content)
    
    prompt = f"""<|system|>
You are an educational content creator for Grade {grade} students. Generate exactly {num_questions} multiple choice questions about {topic}.
{material_context}
Return ONLY a valid JSON array with objects containing: question, options (array of 4 strings), correct_answer (0-3 index).
Make questions relevant to the topic and grade-appropriate.
<|end|>
<|user|>
Generate {num_questions} quiz questions about {topic} for Grade {grade}.
<|end|>
<|assistant|>
["""
    
    try:
        response = "[" + generate_with_model(prompt, max_tokens=1500)
        
        # Try to parse JSON from response
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            questions = json.loads(json_match.group())
            # Validate structure
            valid_questions = []
            for q in questions:
                if isinstance(q, dict) and "question" in q and "options" in q and "correct_answer" in q:
                    if isinstance(q["options"], list) and len(q["options"]) >= 4:
                        valid_questions.append({
                            "question": str(q["question"]),
                            "options": [str(o) for o in q["options"][:4]],
                            "correct_answer": int(q["correct_answer"]) % 4
                        })
            if valid_questions:
                return valid_questions[:num_questions]
        
        raise ValueError("Could not parse quiz questions")
        
    except Exception as e:
        logger.error(f"Quiz generation failed: {e}")
        return generate_fallback_quiz(topic, num_questions, material_content)


def generate_fallback_quiz(topic: str, num_questions: int, material_content: str = None) -> list:
    """Generate fallback quiz questions when model is unavailable."""
    base_questions = [
        {
            "question": f"What is the main concept of {topic}?",
            "options": [f"Core principle of {topic}", "An unrelated concept", "Something completely different", "None of the above"],
            "correct_answer": 0
        },
        {
            "question": f"Which of the following best describes {topic}?",
            "options": ["First description", f"A key aspect of {topic}", "An incorrect statement", "All of the above"],
            "correct_answer": 1
        },
        {
            "question": f"Why is {topic} important to understand?",
            "options": ["It is not important", f"It helps understand key concepts", "It is optional knowledge", "None of these reasons"],
            "correct_answer": 1
        },
        {
            "question": f"How would you apply {topic} in practice?",
            "options": ["Never use it", f"Apply it to solve related problems", "Ignore it completely", "Only in theory"],
            "correct_answer": 1
        },
        {
            "question": f"What is a common misconception about {topic}?",
            "options": [f"That {topic} is simple", "That it has no applications", "That it's only theoretical", "All of these"],
            "correct_answer": 3
        }
    ]
    return base_questions[:num_questions]


def generate_flashcards(topic: str, num_cards: int, grade: int, material_content: str = None) -> list:
    """Generate flashcards for a topic, optionally based on provided material content."""
    global _phi3_model
    import json
    import re
    
    # Build context from material if provided
    material_context = ""
    if material_content:
        material_context = f"""
Based on the following study material:
---
{material_content[:2000]}
---
"""
    
    if _phi3_model is None:
        return generate_fallback_flashcards(topic, num_cards, material_content)
    
    prompt = f"""<|system|>
You are an educational content creator for Grade {grade} students. Generate exactly {num_cards} flashcards about {topic}.
{material_context}
Return ONLY a valid JSON array with objects containing: front (term/question), back (definition/answer).
Make flashcards relevant, educational, and grade-appropriate.
<|end|>
<|user|>
Generate {num_cards} flashcards about {topic} for Grade {grade}.
<|end|>
<|assistant|>
["""
    
    try:
        response = "[" + generate_with_model(prompt, max_tokens=1500)
        
        # Try to parse JSON from response
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            cards = json.loads(json_match.group())
            # Validate structure
            valid_cards = []
            for c in cards:
                if isinstance(c, dict) and "front" in c and "back" in c:
                    valid_cards.append({
                        "front": str(c["front"]),
                        "back": str(c["back"])
                    })
            if valid_cards:
                return valid_cards[:num_cards]
        
        raise ValueError("Could not parse flashcards")
        
    except Exception as e:
        logger.error(f"Flashcard generation failed: {e}")
        return generate_fallback_flashcards(topic, num_cards, material_content)


def generate_fallback_flashcards(topic: str, num_cards: int, material_content: str = None) -> list:
    """Generate fallback flashcards when model is unavailable."""
    base_cards = [
        {"front": f"What is {topic}?", "back": f"{topic} is a key concept in this subject area."},
        {"front": f"Define the main principle of {topic}", "back": f"The main principle involves understanding core aspects of {topic}."},
        {"front": f"Why is {topic} important?", "back": f"{topic} is important because it helps understand related concepts."},
        {"front": f"Give an example of {topic}", "back": f"An example would be applying {topic} to solve real-world problems."},
        {"front": f"What are the key components of {topic}?", "back": f"The key components include various elements that make up {topic}."},
    ]
    return base_cards[:num_cards]


def generate_summary(content: str, grade: int, topic: str = None) -> str:
    """Generate a summary of the provided content."""
    global _phi3_model
    
    topic_str = f" about {topic}" if topic else ""
    
    if _phi3_model is None:
        return f"Summary of the content{topic_str}: This material covers key concepts and important information. The main points include the core ideas presented in the text."
    
    prompt = f"""<|system|>
You are an educational assistant for Grade {grade} students. Summarize the following content{topic_str} in a clear, concise way that is appropriate for the grade level. Highlight the key points and main ideas.
<|end|>
<|user|>
Please summarize this content:

{content[:3000]}
<|end|>
<|assistant|>
"""
    
    try:
        response = generate_with_model(prompt, max_tokens=512)
        if response:
            return response
        return f"Summary of the content{topic_str}: This material covers important concepts related to the subject matter."
        
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        return f"Summary of the content{topic_str}: This material covers important concepts related to the subject matter."


def generate_essay_feedback(essay_content: str, title: str, grade: int, topic: str = None) -> dict:
    """Generate detailed essay feedback using the AI model."""
    global _phi3_model
    import json
    import re
    
    topic_str = f' on the topic of "{topic}"' if topic else ""
    
    if _phi3_model is None:
        return generate_fallback_essay_feedback(essay_content, title, grade)
    
    prompt = f"""<|system|>
You are an essay grading assistant for Grade {grade} students. Grade the following essay{topic_str}.
Provide constructive, encouraging feedback appropriate for the grade level.
Return ONLY a valid JSON object with this exact format:
{{"overallScore": 85, "categories": [{{"name": "Content & Ideas", "score": 80, "feedback": "specific feedback"}}, {{"name": "Organization", "score": 85, "feedback": "feedback"}}, {{"name": "Voice & Style", "score": 90, "feedback": "feedback"}}, {{"name": "Grammar & Mechanics", "score": 85, "feedback": "feedback"}}], "strengths": ["strength 1", "strength 2"], "improvements": ["improvement 1", "improvement 2"], "detailedFeedback": "detailed encouraging feedback"}}
<|end|>
<|user|>
Grade this essay titled "{title}":

{essay_content[:2500]}
<|end|>
<|assistant|>
{{"""
    
    try:
        response = "{" + generate_with_model(prompt, max_tokens=800)
        
        # Try to parse JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            feedback = json.loads(json_match.group())
            # Validate structure
            if "overallScore" in feedback and "categories" in feedback:
                return feedback
        
        raise ValueError("Could not parse essay feedback")
        
    except Exception as e:
        logger.error(f"Essay feedback generation failed: {e}")
        return generate_fallback_essay_feedback(essay_content, title, grade)


def generate_fallback_essay_feedback(essay_content: str, title: str, grade: int) -> dict:
    """Generate fallback essay feedback when model is unavailable."""
    word_count = len(essay_content.split())
    base_score = min(85, 60 + (word_count // 20))
    
    return {
        "overallScore": base_score,
        "categories": [
            {"name": "Content & Ideas", "score": base_score, "feedback": "Your essay presents ideas on the topic. Consider adding more specific examples to strengthen your arguments."},
            {"name": "Organization", "score": base_score - 5, "feedback": "The structure is present. Try to use clearer transitions between paragraphs."},
            {"name": "Voice & Style", "score": base_score + 5, "feedback": "Your voice comes through in the writing. Keep developing your unique style."},
            {"name": "Grammar & Mechanics", "score": base_score, "feedback": "Good use of grammar overall. Review for any spelling or punctuation improvements."}
        ],
        "strengths": [
            "Good effort in addressing the topic",
            "Clear writing style",
            f"Appropriate length ({word_count} words)"
        ],
        "improvements": [
            "Add more specific examples and details",
            "Strengthen the conclusion",
            "Use more varied sentence structures"
        ],
        "detailedFeedback": f"This is a solid essay with a clear attempt to address the topic. Your writing shows good understanding of the subject matter. To improve, focus on adding more specific examples and developing your arguments further. Keep practicing and your writing will continue to improve!"
    }


def generate_diagram_mermaid(content: str, diagram_type: str, grade: int) -> str:
    """Generate Mermaid diagram code from content."""
    global _phi3_model
    
    if _phi3_model is None:
        return generate_fallback_diagram(content, diagram_type)
    
    if diagram_type == "flowchart":
        prompt = f"""<|system|>
You are a diagram creator for Grade {grade} students. Create a Mermaid flowchart diagram for the following content.
Return ONLY valid Mermaid flowchart code starting with 'flowchart TD'. Use proper syntax with nodes and arrows.
<|end|>
<|user|>
Create a flowchart for:
{content[:1500]}
<|end|>
<|assistant|>
flowchart TD"""
    else:  # mindmap
        prompt = f"""<|system|>
You are a diagram creator for Grade {grade} students. Create a Mermaid mindmap diagram for the following content.
Return ONLY valid Mermaid mindmap code starting with 'mindmap'. Use proper mindmap syntax.
<|end|>
<|user|>
Create a mindmap for:
{content[:1500]}
<|end|>
<|assistant|>
mindmap"""
    
    try:
        response = generate_with_model(prompt, max_tokens=500)
        
        if diagram_type == "flowchart":
            mermaid_code = "flowchart TD" + response
        else:
            mermaid_code = "mindmap" + response
        
        # Clean up code blocks if present
        mermaid_code = mermaid_code.replace("```mermaid", "").replace("```", "").strip()
        
        # Validate basic structure
        if diagram_type == "flowchart" and "-->" in mermaid_code:
            return mermaid_code
        elif diagram_type == "mindmap" and "root" in mermaid_code.lower():
            return mermaid_code
        
        return generate_fallback_diagram(content, diagram_type)
        
    except Exception as e:
        logger.error(f"Diagram generation failed: {e}")
        return generate_fallback_diagram(content, diagram_type)


def generate_fallback_diagram(content: str, diagram_type: str) -> str:
    """Generate fallback diagram when model is unavailable."""
    # Extract first few words for labels
    words = content.split()[:10]
    topic = " ".join(words[:3]) if len(words) >= 3 else content[:30]
    
    if diagram_type == "flowchart":
        return f"""flowchart TD
    A[Start: {topic}] --> B[Main Concept]
    B --> C{{Key Decision}}
    C -->|Option 1| D[First Path]
    C -->|Option 2| E[Second Path]
    D --> F[Outcome 1]
    E --> G[Outcome 2]
    F --> H[Conclusion]
    G --> H"""
    else:
        return f"""mindmap
  root(({topic}))
    Main Idea 1
      Detail 1.1
      Detail 1.2
    Main Idea 2
      Detail 2.1
      Detail 2.2
    Main Idea 3
      Detail 3.1"""
