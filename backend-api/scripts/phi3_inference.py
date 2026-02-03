"""
Phi-3 Inference with Stop Sequences
====================================
Prevents output leakage by stopping generation when thought tokens appear.

This module provides:
1. Custom StoppingCriteria for thought/reasoning markers
2. Inference wrapper with built-in safety
3. Post-processing to clean any leaked content
"""

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    StoppingCriteria,
    StoppingCriteriaList,
    GenerationConfig,
    TextStreamer,
)
from typing import List, Optional, Dict, Any, Union
import re
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# STOP SEQUENCES / FORBIDDEN PATTERNS
# =============================================================================

# Tokens/sequences that indicate internal monologue - STOP IMMEDIATELY
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
    "**Analysis:**",
    
    # Bracket markers
    "[Thought]",
    "[Internal]",
    "[Reasoning]",
    
    # Section dividers
    "---Internal",
    "###Thought",
]

# Additional patterns to remove in post-processing
POST_PROCESS_PATTERNS = [
    r'<thought>.*?</thought>',
    r'<thinking>.*?</thinking>',
    r'<reasoning>.*?</reasoning>',
    r'<internal>.*?</internal>',
    r'\*\*Thought:\*\*.*?(?=\n\n|$)',
    r'^Thought:.*$',
    r'^Let me think.*?(?=\n\n|$)',
]


# =============================================================================
# CUSTOM STOPPING CRITERIA
# =============================================================================

class StopOnTokens(StoppingCriteria):
    """Stop generation when specific token sequences are detected."""
    
    def __init__(self, stop_token_ids: List[List[int]], tokenizer):
        self.stop_token_ids = stop_token_ids
        self.tokenizer = tokenizer
    
    def __call__(self, input_ids: torch.LongTensor, scores: torch.FloatTensor, **kwargs) -> bool:
        for stop_ids in self.stop_token_ids:
            if len(stop_ids) > 0:
                # Check if the last N tokens match the stop sequence
                if input_ids.shape[1] >= len(stop_ids):
                    if input_ids[0, -len(stop_ids):].tolist() == stop_ids:
                        return True
        return False


class StopOnStrings(StoppingCriteria):
    """Stop generation when specific strings appear in the decoded output."""
    
    def __init__(self, stop_strings: List[str], tokenizer, input_length: int):
        self.stop_strings = [s.lower() for s in stop_strings]
        self.tokenizer = tokenizer
        self.input_length = input_length
    
    def __call__(self, input_ids: torch.LongTensor, scores: torch.FloatTensor, **kwargs) -> bool:
        # Decode only the generated portion
        generated_ids = input_ids[0, self.input_length:]
        generated_text = self.tokenizer.decode(generated_ids, skip_special_tokens=True).lower()
        
        for stop_string in self.stop_strings:
            if stop_string in generated_text:
                logger.warning(f"Stopped generation: detected '{stop_string}'")
                return True
        return False


# =============================================================================
# PHI-3 INFERENCE WRAPPER
# =============================================================================

class Phi3SafeInference:
    """
    Safe inference wrapper for Phi-3 with output leakage prevention.
    
    Features:
    - Stop sequences for thought/reasoning markers
    - Post-processing cleanup
    - Configurable generation parameters
    """
    
    def __init__(
        self,
        model_path: str,
        device: str = "cuda",
        load_in_4bit: bool = True,
        trust_remote_code: bool = True,
    ):
        """
        Initialize the inference engine.
        
        Args:
            model_path: Path to fine-tuned Phi-3 model or HuggingFace model ID
            device: 'cuda', 'cpu', or 'auto'
            load_in_4bit: Use 4-bit quantization for memory efficiency
            trust_remote_code: Trust remote code for Phi-3
        """
        self.device = device
        
        logger.info(f"Loading model from {model_path}...")
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            trust_remote_code=trust_remote_code,
            padding_side='left',
        )
        
        # Ensure pad token is set
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        # Load model with quantization if requested
        if load_in_4bit and device == "cuda":
            from transformers import BitsAndBytesConfig
            
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
            )
            
            self.model = AutoModelForCausalLM.from_pretrained(
                model_path,
                quantization_config=bnb_config,
                device_map="auto",
                trust_remote_code=trust_remote_code,
                torch_dtype=torch.float16,
            )
        else:
            self.model = AutoModelForCausalLM.from_pretrained(
                model_path,
                device_map="auto" if device != "cpu" else None,
                trust_remote_code=trust_remote_code,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            )
            if device == "cpu":
                self.model = self.model.to(device)
        
        self.model.eval()
        
        # Pre-encode stop sequences
        self.stop_token_ids = self._encode_stop_sequences()
        
        logger.info("Model loaded successfully")
    
    def _encode_stop_sequences(self) -> List[List[int]]:
        """Encode stop sequences to token IDs."""
        stop_ids = []
        for seq in STOP_SEQUENCES:
            encoded = self.tokenizer.encode(seq, add_special_tokens=False)
            if encoded:
                stop_ids.append(encoded)
        return stop_ids
    
    def _create_stopping_criteria(self, input_length: int) -> StoppingCriteriaList:
        """Create stopping criteria list."""
        return StoppingCriteriaList([
            StopOnTokens(self.stop_token_ids, self.tokenizer),
            StopOnStrings(STOP_SEQUENCES, self.tokenizer, input_length),
        ])
    
    def _post_process(self, text: str) -> str:
        """Clean any leaked thought patterns from output."""
        for pattern in POST_PROCESS_PATTERNS:
            text = re.sub(pattern, '', text, flags=re.DOTALL | re.MULTILINE | re.IGNORECASE)
        
        # Clean up whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'  +', ' ', text)
        
        return text.strip()
    
    def _format_prompt(self, messages: List[Dict[str, str]], system_prompt: Optional[str] = None) -> str:
        """Format messages into Phi-3 prompt."""
        from phi3_templates import Phi3Template, PHI3_SYSTEM_PROMPT_STRICT
        
        template = Phi3Template(
            system_prompt=system_prompt or PHI3_SYSTEM_PROMPT_STRICT
        )
        return template.format_for_inference(messages)
    
    def generate(
        self,
        messages: List[Dict[str, str]],
        max_new_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 50,
        repetition_penalty: float = 1.1,
        do_sample: bool = True,
        system_prompt: Optional[str] = None,
        stream: bool = False,
    ) -> str:
        """
        Generate a response with safety guardrails.
        
        Args:
            messages: List of conversation messages [{'role': 'user', 'content': '...'}]
            max_new_tokens: Maximum tokens to generate
            temperature: Sampling temperature (lower = more deterministic)
            top_p: Nucleus sampling threshold
            top_k: Top-k sampling
            repetition_penalty: Penalty for repeating tokens
            do_sample: Whether to sample (False = greedy decoding)
            system_prompt: Override default system prompt
            stream: Whether to stream output to console
        
        Returns:
            Generated response text (cleaned)
        """
        # Format prompt
        prompt = self._format_prompt(messages, system_prompt)
        
        # Tokenize
        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=4096 - max_new_tokens,  # Leave room for generation
        ).to(self.model.device)
        
        input_length = inputs['input_ids'].shape[1]
        
        # Create stopping criteria
        stopping_criteria = self._create_stopping_criteria(input_length)
        
        # Generation config
        gen_config = GenerationConfig(
            max_new_tokens=max_new_tokens,
            temperature=temperature if do_sample else 1.0,
            top_p=top_p,
            top_k=top_k,
            repetition_penalty=repetition_penalty,
            do_sample=do_sample,
            pad_token_id=self.tokenizer.pad_token_id,
            eos_token_id=self.tokenizer.eos_token_id,
        )
        
        # Optional streaming
        streamer = TextStreamer(self.tokenizer, skip_prompt=True) if stream else None
        
        # Generate
        with torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                generation_config=gen_config,
                stopping_criteria=stopping_criteria,
                streamer=streamer,
            )
        
        # Decode only the new tokens
        generated_ids = outputs[0, input_length:]
        response = self.tokenizer.decode(generated_ids, skip_special_tokens=True)
        
        # Remove any trailing stop sequences
        for stop_seq in STOP_SEQUENCES:
            if stop_seq.lower() in response.lower():
                idx = response.lower().find(stop_seq.lower())
                response = response[:idx]
        
        # Post-process to clean any leaked content
        response = self._post_process(response)
        
        return response
    
    def chat(
        self,
        user_input: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        **kwargs
    ) -> str:
        """
        Simple chat interface.
        
        Args:
            user_input: The user's message
            conversation_history: Optional previous conversation turns
            **kwargs: Additional arguments passed to generate()
        
        Returns:
            Assistant's response
        """
        messages = conversation_history or []
        messages.append({'role': 'user', 'content': user_input})
        
        return self.generate(messages, **kwargs)


# =============================================================================
# SIMPLE INFERENCE FUNCTION (STANDALONE)
# =============================================================================

def safe_generate(
    model,
    tokenizer,
    prompt: str,
    max_new_tokens: int = 512,
    temperature: float = 0.7,
    device: str = "cuda",
) -> str:
    """
    Standalone safe generation function.
    
    Use this if you already have model/tokenizer loaded.
    """
    # Encode stop sequences
    stop_ids = []
    for seq in STOP_SEQUENCES:
        encoded = tokenizer.encode(seq, add_special_tokens=False)
        if encoded:
            stop_ids.append(encoded)
    
    # Tokenize input
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    input_length = inputs['input_ids'].shape[1]
    
    # Create stopping criteria
    stopping_criteria = StoppingCriteriaList([
        StopOnTokens(stop_ids, tokenizer),
        StopOnStrings(STOP_SEQUENCES, tokenizer, input_length),
    ])
    
    # Generate
    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=True,
            top_p=0.9,
            repetition_penalty=1.1,
            stopping_criteria=stopping_criteria,
            pad_token_id=tokenizer.pad_token_id,
        )
    
    # Decode
    response = tokenizer.decode(outputs[0, input_length:], skip_special_tokens=True)
    
    # Clean stop sequences from output
    for stop_seq in STOP_SEQUENCES:
        if stop_seq.lower() in response.lower():
            idx = response.lower().find(stop_seq.lower())
            response = response[:idx]
    
    # Post-process
    for pattern in POST_PROCESS_PATTERNS:
        response = re.sub(pattern, '', response, flags=re.DOTALL | re.MULTILINE | re.IGNORECASE)
    
    return response.strip()


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == '__main__':
    # Example: Load and use the safe inference engine
    
    # Initialize (adjust path to your fine-tuned model)
    MODEL_PATH = "microsoft/Phi-3-mini-4k-instruct"  # or your fine-tuned path
    
    print("Loading model...")
    engine = Phi3SafeInference(
        model_path=MODEL_PATH,
        device="cuda",
        load_in_4bit=True,
    )
    
    # Single turn example
    response = engine.chat(
        "What is photosynthesis? Explain it simply.",
        temperature=0.7,
    )
    print(f"\nResponse:\n{response}")
    
    # Multi-turn example
    history = [
        {'role': 'user', 'content': 'Hi! I\'m learning about space.'},
        {'role': 'assistant', 'content': 'That\'s exciting! Space is full of amazing things to discover. What would you like to know about? 🚀'},
    ]
    
    response = engine.chat(
        "Why do stars twinkle?",
        conversation_history=history,
        temperature=0.7,
    )
    print(f"\nFollow-up response:\n{response}")
