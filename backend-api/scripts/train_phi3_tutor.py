#!/usr/bin/env python3
"""
Complete Phi-3 Fine-Tuning Pipeline
=====================================
Full training script with all optimizations for:
- No output leakage (thoughts/reasoning)
- Improved context retention
- Anti-overfitting measures

Usage:
    python train_phi3_tutor.py --dataset train.jsonl --output ./phi3-tutor

Requirements:
    pip install torch transformers peft bitsandbytes accelerate datasets trl
"""

import argparse
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional

import torch
from datasets import Dataset, load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import LoraConfig, TaskType, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

# Import our custom modules
from phi3_templates import Phi3Template, PHI3_SYSTEM_PROMPT_STRICT
from phi3_training_config import get_training_arguments, get_lora_config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# =============================================================================
# DATASET PROCESSING
# =============================================================================

def load_and_process_dataset(
    dataset_path: str,
    tokenizer,
    max_length: int = 2048,
    val_split: float = 0.1,
) -> tuple:
    """
    Load JSONL dataset and format for training.
    
    Args:
        dataset_path: Path to JSONL file
        tokenizer: Tokenizer for encoding
        max_length: Maximum sequence length
        val_split: Validation split ratio
    
    Returns:
        (train_dataset, val_dataset)
    """
    template = Phi3Template(system_prompt=PHI3_SYSTEM_PROMPT_STRICT)
    
    processed_examples = []
    
    with open(dataset_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            try:
                entry = json.loads(line.strip())
                
                # Handle different formats
                if 'messages' in entry:
                    # Conversation format
                    text = template.format_conversation(entry['messages'])
                elif 'conversations' in entry:
                    # Alpaca-style
                    text = template.format_conversation(entry['conversations'])
                elif 'instruction' in entry and 'output' in entry:
                    # Instruction format
                    user_msg = entry['instruction']
                    if entry.get('input'):
                        user_msg += f"\n\n{entry['input']}"
                    messages = [
                        {'role': 'user', 'content': user_msg},
                        {'role': 'assistant', 'content': entry['output']}
                    ]
                    text = template.format_conversation(messages)
                elif 'text' in entry:
                    # Already formatted
                    text = entry['text']
                else:
                    logger.warning(f"Line {line_num}: Unknown format, skipping")
                    continue
                
                processed_examples.append({'text': text})
                
            except json.JSONDecodeError as e:
                logger.error(f"Line {line_num}: JSON error - {e}")
    
    logger.info(f"Loaded {len(processed_examples)} examples")
    
    # Create dataset
    dataset = Dataset.from_list(processed_examples)
    
    # Split into train/val
    if val_split > 0:
        split = dataset.train_test_split(test_size=val_split, seed=42)
        return split['train'], split['test']
    
    return dataset, None


# =============================================================================
# TRAINING FUNCTION
# =============================================================================

def train(
    model_name: str,
    dataset_path: str,
    output_dir: str,
    num_epochs: int = 3,
    batch_size: int = 4,
    gradient_accumulation_steps: int = 8,
    learning_rate: float = 2e-5,
    max_length: int = 2048,
    lora_r: int = 16,
    lora_alpha: int = 32,
    lora_dropout: float = 0.1,
    use_4bit: bool = True,
    resume_from: Optional[str] = None,
):
    """
    Main training function.
    """
    logger.info("=" * 60)
    logger.info("PHI-3 FINE-TUNING FOR LEARNAI TUTOR")
    logger.info("=" * 60)
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # =========================================================================
    # LOAD TOKENIZER
    # =========================================================================
    logger.info(f"Loading tokenizer from {model_name}...")
    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        trust_remote_code=True,
        padding_side="right",  # Right padding for training
    )
    
    # Set padding token
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.pad_token_id = tokenizer.eos_token_id
    
    # =========================================================================
    # LOAD DATASET
    # =========================================================================
    logger.info(f"Loading dataset from {dataset_path}...")
    train_dataset, val_dataset = load_and_process_dataset(
        dataset_path,
        tokenizer,
        max_length=max_length,
    )
    logger.info(f"Train samples: {len(train_dataset)}")
    if val_dataset:
        logger.info(f"Val samples: {len(val_dataset)}")
    
    # =========================================================================
    # LOAD MODEL
    # =========================================================================
    logger.info(f"Loading model from {model_name}...")
    
    if use_4bit:
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
            attn_implementation="flash_attention_2" if torch.cuda.is_available() else "eager",
        )
    else:
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.float16,
        )
    
    # Enable gradient checkpointing
    model.gradient_checkpointing_enable()
    
    # Prepare for k-bit training
    model = prepare_model_for_kbit_training(model)
    
    # =========================================================================
    # APPLY LORA
    # =========================================================================
    logger.info("Applying LoRA configuration...")
    
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=lora_r,
        lora_alpha=lora_alpha,
        lora_dropout=lora_dropout,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
        bias="none",
        inference_mode=False,
    )
    
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    # =========================================================================
    # TRAINING ARGUMENTS
    # =========================================================================
    training_args = TrainingArguments(
        output_dir=output_dir,
        
        # Epochs and batching
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        gradient_accumulation_steps=gradient_accumulation_steps,
        
        # Learning rate and schedule
        learning_rate=learning_rate,
        lr_scheduler_type="cosine",
        warmup_ratio=0.1,
        
        # Regularization (ANTI-OVERFITTING)
        weight_decay=0.1,
        max_grad_norm=1.0,
        label_smoothing_factor=0.1,
        
        # Precision
        fp16=True,
        gradient_checkpointing=True,
        
        # Logging
        logging_dir=f"{output_dir}/logs",
        logging_steps=10,
        logging_first_step=True,
        
        # Saving
        save_strategy="steps",
        save_steps=50,
        save_total_limit=3,
        
        # Evaluation
        eval_strategy="steps" if val_dataset else "no",
        eval_steps=50 if val_dataset else None,
        load_best_model_at_end=True if val_dataset else False,
        metric_for_best_model="eval_loss" if val_dataset else None,
        
        # Other
        dataloader_num_workers=4,
        report_to=["tensorboard"],
        seed=42,
    )
    
    # =========================================================================
    # TRAINER
    # =========================================================================
    logger.info("Initializing trainer...")
    
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
        dataset_text_field="text",
        max_seq_length=max_length,
        packing=False,  # Don't pack sequences for better context learning
    )
    
    # =========================================================================
    # TRAIN
    # =========================================================================
    logger.info("Starting training...")
    
    if resume_from:
        trainer.train(resume_from_checkpoint=resume_from)
    else:
        trainer.train()
    
    # =========================================================================
    # SAVE
    # =========================================================================
    logger.info(f"Saving model to {output_dir}...")
    
    # Save LoRA weights
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    # Save merged model (optional - for easier inference)
    merged_dir = f"{output_dir}/merged"
    logger.info(f"Saving merged model to {merged_dir}...")
    
    merged_model = model.merge_and_unload()
    merged_model.save_pretrained(merged_dir)
    tokenizer.save_pretrained(merged_dir)
    
    logger.info("=" * 60)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 60)
    logger.info(f"LoRA weights: {output_dir}")
    logger.info(f"Merged model: {merged_dir}")
    
    return model, tokenizer


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Fine-tune Phi-3 for LearnAI Tutor',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    
    parser.add_argument('--model', type=str, 
                        default='microsoft/Phi-3-mini-4k-instruct',
                        help='Base model name or path')
    parser.add_argument('--dataset', type=str, required=True,
                        help='Path to training JSONL file')
    parser.add_argument('--output', type=str, default='./phi3-tutor-lora',
                        help='Output directory for model')
    
    # Training parameters
    parser.add_argument('--epochs', type=int, default=3,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=4,
                        help='Per-device batch size')
    parser.add_argument('--grad-accum', type=int, default=8,
                        help='Gradient accumulation steps')
    parser.add_argument('--lr', type=float, default=2e-5,
                        help='Learning rate')
    parser.add_argument('--max-length', type=int, default=2048,
                        help='Maximum sequence length')
    
    # LoRA parameters
    parser.add_argument('--lora-r', type=int, default=16,
                        help='LoRA rank')
    parser.add_argument('--lora-alpha', type=int, default=32,
                        help='LoRA alpha')
    parser.add_argument('--lora-dropout', type=float, default=0.1,
                        help='LoRA dropout')
    
    # Other
    parser.add_argument('--no-4bit', action='store_true',
                        help='Disable 4-bit quantization')
    parser.add_argument('--resume', type=str, default=None,
                        help='Resume from checkpoint')
    
    args = parser.parse_args()
    
    train(
        model_name=args.model,
        dataset_path=args.dataset,
        output_dir=args.output,
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        max_length=args.max_length,
        lora_r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        use_4bit=not args.no_4bit,
        resume_from=args.resume,
    )


if __name__ == '__main__':
    main()
