"""
Phi-3 Fine-Tuning Configuration
================================
Optimized training arguments to prevent overfitting on formatting
while maintaining flexibility and context retention.

Key optimizations:
1. Lower learning rate to prevent memorizing exact patterns
2. Higher weight decay for regularization
3. Gradient accumulation for stable updates
4. Warmup steps for smoother training start
5. Label smoothing to prevent overconfident predictions
"""

from dataclasses import dataclass, field
from typing import Optional, List
from transformers import TrainingArguments, Trainer
from peft import LoraConfig, TaskType, get_peft_model
import torch


# =============================================================================
# TRAINING ARGUMENTS - ANTI-OVERFITTING CONFIGURATION
# =============================================================================

def get_training_arguments(
    output_dir: str = "./phi3-tutor-lora",
    num_epochs: int = 3,
    batch_size: int = 4,
    gradient_accumulation_steps: int = 8,
    learning_rate: float = 2e-5,  # Lower LR to prevent format memorization
    dataset_size: int = 500,
) -> TrainingArguments:
    """
    Create optimized TrainingArguments for Phi-3 fine-tuning.
    
    Key settings to prevent overfitting on formatting:
    - learning_rate: 2e-5 (lower than default 5e-5)
    - weight_decay: 0.1 (strong regularization)
    - warmup_ratio: 0.1 (10% warmup for stability)
    - label_smoothing_factor: 0.1 (prevents overconfident predictions)
    
    Args:
        output_dir: Where to save checkpoints
        num_epochs: Number of training epochs (2-3 recommended for 500 samples)
        batch_size: Per-device batch size
        gradient_accumulation_steps: Accumulate gradients over N steps
        learning_rate: Base learning rate
        dataset_size: Size of training dataset (for logging)
    """
    
    # Calculate total steps for logging
    effective_batch_size = batch_size * gradient_accumulation_steps
    steps_per_epoch = dataset_size // effective_batch_size
    total_steps = steps_per_epoch * num_epochs
    
    return TrainingArguments(
        output_dir=output_dir,
        
        # ============================================================
        # EPOCHS & BATCH SIZE
        # ============================================================
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        gradient_accumulation_steps=gradient_accumulation_steps,
        # Effective batch size = 4 * 8 = 32
        
        # ============================================================
        # LEARNING RATE & SCHEDULER
        # Lower LR prevents memorizing exact formatting patterns
        # ============================================================
        learning_rate=learning_rate,  # 2e-5 instead of 5e-5
        lr_scheduler_type="cosine",  # Smooth decay, better for fine-tuning
        warmup_ratio=0.1,  # 10% warmup prevents early instability
        # warmup_steps=50,  # Alternative: fixed warmup steps
        
        # ============================================================
        # REGULARIZATION - CRITICAL FOR PREVENTING OVERFITTING
        # ============================================================
        weight_decay=0.1,  # Strong regularization (default is 0.01)
        max_grad_norm=1.0,  # Gradient clipping for stability
        
        # Label smoothing: Prevents model from being overconfident
        # Helps maintain flexibility in responses
        label_smoothing_factor=0.1,
        
        # ============================================================
        # PRECISION & MEMORY
        # ============================================================
        fp16=True,  # Use FP16 for memory efficiency
        # bf16=True,  # Use BF16 if your GPU supports it (A100, 4090)
        gradient_checkpointing=True,  # Trade compute for memory
        
        # ============================================================
        # LOGGING & SAVING
        # ============================================================
        logging_dir=f"{output_dir}/logs",
        logging_steps=10,
        logging_first_step=True,
        
        save_strategy="steps",
        save_steps=100,
        save_total_limit=3,  # Keep only 3 best checkpoints
        
        eval_strategy="steps" if dataset_size > 100 else "epoch",
        eval_steps=100,
        
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        
        # ============================================================
        # OTHER SETTINGS
        # ============================================================
        dataloader_num_workers=4,
        dataloader_pin_memory=True,
        remove_unused_columns=False,  # Keep all columns for custom processing
        
        # For reproducibility
        seed=42,
        data_seed=42,
        
        # Report to TensorBoard/WandB
        report_to=["tensorboard"],
        
        # Disable certain features for cleaner training
        push_to_hub=False,
        disable_tqdm=False,
    )


# =============================================================================
# LORA CONFIGURATION - PARAMETER EFFICIENT FINE-TUNING
# =============================================================================

def get_lora_config(
    r: int = 16,  # Rank of the low-rank matrices
    lora_alpha: int = 32,  # Scaling factor
    lora_dropout: float = 0.1,  # Dropout for regularization
    target_modules: Optional[List[str]] = None,
) -> LoraConfig:
    """
    Create LoRA configuration for Phi-3.
    
    Args:
        r: LoRA rank (16-64 recommended, lower = less overfitting)
        lora_alpha: LoRA alpha (typically 2x rank)
        lora_dropout: Dropout probability (0.05-0.1 for regularization)
        target_modules: Which modules to apply LoRA to
    """
    
    # Default target modules for Phi-3
    if target_modules is None:
        target_modules = [
            "q_proj",   # Query projection
            "k_proj",   # Key projection  
            "v_proj",   # Value projection
            "o_proj",   # Output projection
            "gate_proj",  # MLP gate
            "up_proj",    # MLP up
            "down_proj",  # MLP down
        ]
    
    return LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=r,
        lora_alpha=lora_alpha,
        lora_dropout=lora_dropout,
        target_modules=target_modules,
        bias="none",  # Don't train biases
        
        # Additional settings for better training
        inference_mode=False,
        
        # Fan-in/fan-out initialization
        init_lora_weights="gaussian",
    )


# =============================================================================
# ALTERNATIVE CONFIGURATIONS
# =============================================================================

# For very small datasets (< 200 samples) - more conservative
SMALL_DATASET_CONFIG = {
    "learning_rate": 1e-5,  # Even lower
    "num_train_epochs": 2,  # Fewer epochs
    "weight_decay": 0.15,  # Stronger regularization
    "label_smoothing_factor": 0.15,
    "lora_r": 8,  # Lower rank
    "lora_dropout": 0.15,  # Higher dropout
}

# For larger datasets (> 1000 samples) - can be more aggressive
LARGE_DATASET_CONFIG = {
    "learning_rate": 3e-5,
    "num_train_epochs": 3,
    "weight_decay": 0.05,
    "label_smoothing_factor": 0.05,
    "lora_r": 32,
    "lora_dropout": 0.05,
}

# For context retention improvement - focus on attention layers
CONTEXT_FOCUS_CONFIG = {
    "learning_rate": 1.5e-5,
    "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj"],  # Attention only
    "lora_r": 32,  # Higher rank for attention
    "lora_alpha": 64,
}


# =============================================================================
# CUSTOM DATA COLLATOR FOR CONTEXT RETENTION
# =============================================================================

from transformers import DataCollatorForLanguageModeling
from dataclasses import dataclass

@dataclass
class ContextAwareDataCollator:
    """
    Custom data collator that helps with context retention by:
    1. Properly masking padding tokens
    2. Ensuring attention masks are correct for multi-turn conversations
    """
    
    tokenizer: any
    mlm: bool = False
    
    def __call__(self, features):
        # Stack all features
        batch = {}
        
        # Get max length in batch
        max_length = max(len(f["input_ids"]) for f in features)
        
        input_ids = []
        attention_mask = []
        labels = []
        
        for f in features:
            # Pad to max length
            padding_length = max_length - len(f["input_ids"])
            
            # Left padding for better generation
            input_ids.append([self.tokenizer.pad_token_id] * padding_length + f["input_ids"])
            attention_mask.append([0] * padding_length + [1] * len(f["input_ids"]))
            
            # Labels: -100 for padding (ignored in loss), actual tokens for rest
            if "labels" in f:
                labels.append([-100] * padding_length + f["labels"])
            else:
                labels.append([-100] * padding_length + f["input_ids"])
        
        batch["input_ids"] = torch.tensor(input_ids)
        batch["attention_mask"] = torch.tensor(attention_mask)
        batch["labels"] = torch.tensor(labels)
        
        return batch


# =============================================================================
# FULL TRAINING SETUP EXAMPLE
# =============================================================================

def setup_training(
    model_name: str = "microsoft/Phi-3-mini-4k-instruct",
    dataset_path: str = "train_clean.jsonl",
    output_dir: str = "./phi3-tutor-lora",
    dataset_size: int = 500,
):
    """
    Complete training setup with all optimizations.
    
    Returns:
        Tuple of (model, tokenizer, training_args, lora_config)
    """
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from datasets import load_dataset
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        trust_remote_code=True,
        padding_side="left",
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    # Load model with quantization
    from transformers import BitsAndBytesConfig
    
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )
    
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=torch.float16,
    )
    
    # Enable gradient checkpointing
    model.gradient_checkpointing_enable()
    
    # Prepare model for k-bit training
    from peft import prepare_model_for_kbit_training
    model = prepare_model_for_kbit_training(model)
    
    # Apply LoRA
    lora_config = get_lora_config()
    model = get_peft_model(model, lora_config)
    
    # Print trainable parameters
    model.print_trainable_parameters()
    
    # Get training arguments
    training_args = get_training_arguments(
        output_dir=output_dir,
        dataset_size=dataset_size,
    )
    
    return model, tokenizer, training_args, lora_config


# =============================================================================
# TRAINING TIPS FOR CONTEXT RETENTION
# =============================================================================

TRAINING_TIPS = """
============================================================
TIPS FOR IMPROVING CONTEXT RETENTION IN PHI-3 FINE-TUNING
============================================================

1. DATASET QUALITY
   - Include multi-turn conversations in your dataset
   - Each example should have 2-4 turns showing context usage
   - Include examples where assistant references previous messages
   
   Example:
   User: My name is Alex.
   Assistant: Nice to meet you, Alex!
   User: What's my name?
   Assistant: Your name is Alex, as you mentioned earlier!

2. PROMPT FORMAT CONSISTENCY
   - Use the same format (Phi-3 native or ChatML) throughout
   - Include full conversation history in each training example
   - Don't truncate context - model needs to learn from full examples

3. TRAINING PARAMETERS FOR CONTEXT
   - Use lower learning rate (1-2e-5) to preserve base model knowledge
   - Focus LoRA on attention layers (q_proj, k_proj, v_proj)
   - Higher rank (32+) for attention modules specifically

4. DATA AUGMENTATION
   - Create variations of conversations with shuffled details
   - Include examples where context is spread across multiple turns
   - Add examples with explicit context references

5. EVALUATION
   - Test with multi-turn conversations
   - Check if model remembers user name, preferences, previous statements
   - Include context-dependent questions in validation set

============================================================
"""

if __name__ == '__main__':
    print(TRAINING_TIPS)
    
    # Example: Create training config
    training_args = get_training_arguments(
        output_dir="./phi3-tutor-lora",
        num_epochs=3,
        dataset_size=500,
    )
    
    print("\nTraining Arguments:")
    print(f"  Learning Rate: {training_args.learning_rate}")
    print(f"  Weight Decay: {training_args.weight_decay}")
    print(f"  Label Smoothing: {training_args.label_smoothing_factor}")
    print(f"  Warmup Ratio: {training_args.warmup_ratio}")
    print(f"  Effective Batch Size: {training_args.per_device_train_batch_size * training_args.gradient_accumulation_steps}")
    
    lora_config = get_lora_config()
    print("\nLoRA Config:")
    print(f"  Rank: {lora_config.r}")
    print(f"  Alpha: {lora_config.lora_alpha}")
    print(f"  Dropout: {lora_config.lora_dropout}")
    print(f"  Target Modules: {lora_config.target_modules}")
