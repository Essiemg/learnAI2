"""
Main Training Script for TTS Model
Train your own voice model from scratch!
"""
import argparse
import sys
import os
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.resolve()

# Change to script directory
os.chdir(SCRIPT_DIR)

# Add src to path
sys.path.insert(0, str(SCRIPT_DIR))

from src.config import TTSConfig
from src.train import TTSTrainer


def main():
    parser = argparse.ArgumentParser(
        description="Train a TTS voice model from scratch"
    )
    parser.add_argument(
        '--epochs',
        type=int,
        default=500,
        help='Number of training epochs (default: 500)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=16,
        help='Batch size (default: 16, reduce if OOM)'
    )
    parser.add_argument(
        '--lr',
        type=float,
        default=1e-3,
        help='Learning rate (default: 0.001)'
    )
    parser.add_argument(
        '--quick',
        action='store_true',
        help='Quick test with 1000 samples and 50 epochs'
    )
    parser.add_argument(
        '--resume',
        type=str,
        default=None,
        help='Resume from checkpoint path'
    )
    parser.add_argument(
        '--data-path',
        type=str,
        default='datasets/data/processed/metadata.txt',
        help='Path to metadata file'
    )
    args = parser.parse_args()
    
    # Create config
    config = TTSConfig()
    config.batch_size = args.batch_size
    config.learning_rate = args.lr
    config.data_path = args.data_path
    
    # Quick test mode
    if args.quick:
        print("\n" + "="*50)
        print("QUICK TEST MODE")
        print("Training on 1000 samples for 50 epochs")
        print("="*50 + "\n")
        max_samples = 1000
        epochs = 50
    else:
        max_samples = None
        epochs = args.epochs
    
    # Create trainer
    trainer = TTSTrainer(config)
    
    # Resume if specified
    if args.resume:
        trainer.load_checkpoint(args.resume)
    
    # Print training info
    print("\n" + "="*50)
    print("TTS MODEL TRAINING")
    print("="*50)
    print(f"Architecture: Tacotron2")
    print(f"Epochs: {epochs}")
    print(f"Batch Size: {config.batch_size}")
    print(f"Learning Rate: {config.learning_rate}")
    print(f"Device: {trainer.device}")
    print(f"Data Path: {config.data_path}")
    print("="*50 + "\n")
    
    # Train
    try:
        losses = trainer.train(
            epochs=epochs,
            max_samples=max_samples,
            checkpoint_every=10
        )
        
        print("\n" + "="*50)
        print("TRAINING COMPLETE!")
        print("="*50)
        print(f"Final Loss: {losses[-1]:.4f}")
        print(f"Best Loss: {trainer.best_loss:.4f}")
        print(f"\nModel saved to: {config.output_dir}/")
        print("\nTo use your model:")
        print(f"  python -c \"from src.inference import TTSSynthesizer; tts = TTSSynthesizer('{config.output_dir}/best_model.pt'); tts.synthesize('Hello world!', 'output.wav')\"")
        print("="*50)
        
    except KeyboardInterrupt:
        print("\nTraining interrupted by user")
        # Save checkpoint
        ckpt_path = Path(config.checkpoint_dir) / 'interrupted_checkpoint.pt'
        trainer.save_checkpoint(str(ckpt_path))
        print(f"Checkpoint saved to {ckpt_path}")


if __name__ == "__main__":
    main()
