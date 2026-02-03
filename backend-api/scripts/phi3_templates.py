"""
Phi-3 Prompt Templates for Fine-Tuning
=======================================
ChatML and Phi-3 native templates with anti-leakage system instructions.

These templates ensure:
1. Clear separation between system/user/assistant roles
2. Explicit instructions to prevent internal monologue output
3. Kid-friendly response formatting for educational context
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
import json


# =============================================================================
# PHI-3 NATIVE CHAT TEMPLATE
# =============================================================================
# Phi-3 uses a specific format: <|user|>\n{message}<|end|>\n<|assistant|>

PHI3_SYSTEM_PROMPT = """You are Toki, a friendly and helpful AI tutor for children and students.

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


PHI3_SYSTEM_PROMPT_STRICT = """You are Toki, an AI educational assistant.

## ABSOLUTE RESTRICTIONS ##
You are FORBIDDEN from outputting ANY of the following:
- Internal thoughts or reasoning (e.g., "Let me think...", "I should consider...")
- XML tags (e.g., <thought>, <reasoning>, <internal>, <analysis>)
- Labeled sections (e.g., "Thought:", "Reasoning:", "Step 1:")
- Scratchpad content or working notes
- Chain-of-thought explanations
- Meta-commentary about your response process

## REQUIRED BEHAVIOR ##
- Provide ONLY the direct, helpful answer
- Be friendly and encouraging
- Use age-appropriate language
- Stay focused on the educational topic

If you violate these rules, your response will be rejected."""


# =============================================================================
# TEMPLATE FORMATTERS
# =============================================================================

@dataclass
class Phi3Template:
    """Phi-3 native template formatter."""
    
    system_prompt: str = PHI3_SYSTEM_PROMPT
    
    def format_single(self, user_message: str, assistant_response: Optional[str] = None) -> str:
        """Format a single turn for training or inference."""
        prompt = f"<|system|>\n{self.system_prompt}<|end|>\n"
        prompt += f"<|user|>\n{user_message}<|end|>\n"
        prompt += "<|assistant|>\n"
        
        if assistant_response:
            prompt += f"{assistant_response}<|end|>\n"
        
        return prompt
    
    def format_conversation(self, messages: List[Dict[str, str]]) -> str:
        """
        Format a multi-turn conversation.
        
        Args:
            messages: List of dicts with 'role' and 'content' keys
                     roles: 'system', 'user', 'assistant'
        """
        prompt = ""
        has_system = False
        
        for msg in messages:
            role = msg['role'].lower()
            content = msg['content']
            
            if role == 'system':
                prompt += f"<|system|>\n{content}<|end|>\n"
                has_system = True
            elif role == 'user':
                prompt += f"<|user|>\n{content}<|end|>\n"
            elif role == 'assistant':
                prompt += f"<|assistant|>\n{content}<|end|>\n"
        
        # Add system prompt if not present
        if not has_system:
            prompt = f"<|system|>\n{self.system_prompt}<|end|>\n" + prompt
        
        return prompt
    
    def format_for_inference(self, messages: List[Dict[str, str]]) -> str:
        """Format for inference (no final <|end|> token)."""
        prompt = self.format_conversation(messages)
        
        # Remove trailing assistant end token and add assistant prompt
        if not prompt.endswith("<|assistant|>\n"):
            prompt += "<|assistant|>\n"
        
        return prompt


@dataclass  
class ChatMLTemplate:
    """ChatML template formatter (alternative format)."""
    
    system_prompt: str = PHI3_SYSTEM_PROMPT
    
    def format_single(self, user_message: str, assistant_response: Optional[str] = None) -> str:
        """Format a single turn."""
        prompt = f"<|im_start|>system\n{self.system_prompt}<|im_end|>\n"
        prompt += f"<|im_start|>user\n{user_message}<|im_end|>\n"
        prompt += "<|im_start|>assistant\n"
        
        if assistant_response:
            prompt += f"{assistant_response}<|im_end|>\n"
        
        return prompt
    
    def format_conversation(self, messages: List[Dict[str, str]]) -> str:
        """Format multi-turn conversation in ChatML format."""
        prompt = ""
        has_system = False
        
        for msg in messages:
            role = msg['role'].lower()
            content = msg['content']
            
            if role == 'system':
                prompt += f"<|im_start|>system\n{content}<|im_end|>\n"
                has_system = True
            elif role == 'user':
                prompt += f"<|im_start|>user\n{content}<|im_end|>\n"
            elif role == 'assistant':
                prompt += f"<|im_start|>assistant\n{content}<|im_end|>\n"
        
        if not has_system:
            prompt = f"<|im_start|>system\n{self.system_prompt}<|im_end|>\n" + prompt
        
        return prompt
    
    def format_for_inference(self, messages: List[Dict[str, str]]) -> str:
        """Format for inference."""
        prompt = self.format_conversation(messages)
        if not prompt.endswith("<|im_start|>assistant\n"):
            prompt += "<|im_start|>assistant\n"
        return prompt


# =============================================================================
# DATASET CONVERSION UTILITIES
# =============================================================================

def convert_to_phi3_format(input_path: str, output_path: str, use_strict: bool = True):
    """
    Convert JSONL dataset to Phi-3 format with anti-leakage system prompt.
    
    Expected input format:
    {"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
    
    Or:
    {"instruction": "...", "input": "...", "output": "..."}
    """
    template = Phi3Template(
        system_prompt=PHI3_SYSTEM_PROMPT_STRICT if use_strict else PHI3_SYSTEM_PROMPT
    )
    
    with open(input_path, 'r', encoding='utf-8') as f_in, \
         open(output_path, 'w', encoding='utf-8') as f_out:
        
        for line in f_in:
            entry = json.loads(line.strip())
            
            # Handle messages format
            if 'messages' in entry:
                formatted = template.format_conversation(entry['messages'])
                output_entry = {'text': formatted}
            
            # Handle instruction format
            elif 'instruction' in entry:
                user_msg = entry['instruction']
                if entry.get('input'):
                    user_msg += f"\n\n{entry['input']}"
                
                messages = [
                    {'role': 'user', 'content': user_msg},
                    {'role': 'assistant', 'content': entry['output']}
                ]
                formatted = template.format_conversation(messages)
                output_entry = {'text': formatted}
            
            else:
                continue
            
            f_out.write(json.dumps(output_entry, ensure_ascii=False) + '\n')


def create_training_example(
    user_input: str,
    assistant_output: str,
    template_type: str = 'phi3',
    use_strict: bool = True
) -> str:
    """
    Create a single formatted training example.
    
    Args:
        user_input: The user's question/request
        assistant_output: The desired assistant response (clean, no thoughts)
        template_type: 'phi3' or 'chatml'
        use_strict: Use strict anti-leakage system prompt
    """
    system = PHI3_SYSTEM_PROMPT_STRICT if use_strict else PHI3_SYSTEM_PROMPT
    
    if template_type == 'phi3':
        template = Phi3Template(system_prompt=system)
    else:
        template = ChatMLTemplate(system_prompt=system)
    
    return template.format_single(user_input, assistant_output)


# =============================================================================
# SPECIAL TOKENS FOR TOKENIZER
# =============================================================================

PHI3_SPECIAL_TOKENS = {
    'bos_token': '<s>',
    'eos_token': '<|end|>',
    'pad_token': '<|pad|>',
    'additional_special_tokens': [
        '<|system|>',
        '<|user|>',
        '<|assistant|>',
        '<|end|>',
    ]
}

CHATML_SPECIAL_TOKENS = {
    'bos_token': '<s>',
    'eos_token': '<|im_end|>',
    'pad_token': '<|pad|>',
    'additional_special_tokens': [
        '<|im_start|>',
        '<|im_end|>',
    ]
}


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == '__main__':
    # Example: Create a training sample
    template = Phi3Template(system_prompt=PHI3_SYSTEM_PROMPT_STRICT)
    
    # Multi-turn example
    conversation = [
        {'role': 'user', 'content': 'What is photosynthesis?'},
        {'role': 'assistant', 'content': 'Photosynthesis is how plants make their food using sunlight! 🌱\n\nPlants take in sunlight through their leaves, absorb water from their roots, and breathe in carbon dioxide from the air. They mix all these together to create glucose (a type of sugar) for energy, and release oxygen as a bonus - which is the air we breathe!\n\nThink of it like a plant\'s kitchen where sunlight is the chef! 👨‍🍳'},
        {'role': 'user', 'content': 'Why are leaves green?'},
        {'role': 'assistant', 'content': 'Great follow-up question! 🍃\n\nLeaves are green because of a special ingredient called chlorophyll. Chlorophyll is like tiny green helpers inside leaves that catch sunlight for photosynthesis.\n\nHere\'s the cool part: chlorophyll absorbs red and blue light from the sun, but it bounces back green light - and that\'s the color we see!\n\nIt\'s like wearing a green t-shirt - the shirt absorbs other colors and reflects green back to our eyes! 👀'},
    ]
    
    formatted = template.format_conversation(conversation)
    print("=" * 60)
    print("FORMATTED TRAINING EXAMPLE")
    print("=" * 60)
    print(formatted)
    
    # For inference (stops before assistant response)
    inference_messages = [
        {'role': 'user', 'content': 'Explain gravity to a 10-year-old'},
    ]
    inference_prompt = template.format_for_inference(inference_messages)
    print("\n" + "=" * 60)
    print("INFERENCE PROMPT")
    print("=" * 60)
    print(inference_prompt)
