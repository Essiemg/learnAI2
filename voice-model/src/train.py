"""
TTS Model Training
"""
import os
os.environ['PYTORCH_JIT'] = '0'  # Disable JIT to avoid dynamo issues

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from pathlib import Path
from tqdm import tqdm
from typing import Optional, Dict
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

from .config import TTSConfig
from .dataset import LJSpeechDataset, collate_fn
from .model import Tacotron2


class TTSTrainer:
    """Trainer for Tacotron2 TTS model"""
    
    def __init__(
        self,
        config: TTSConfig,
        device: Optional[str] = None
    ):
        self.config = config
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        # Create model
        self.model = Tacotron2(config).to(self.device)
        
        # Optimizer
        self.optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay
        )
        
        # Learning rate scheduler
        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', factor=0.5, patience=10
        )
        
        # Loss functions
        self.mse_loss = nn.MSELoss()
        self.bce_loss = nn.BCEWithLogitsLoss()
        
        # Training state
        self.epoch = 0
        self.global_step = 0
        self.best_loss = float('inf')
        
        # Create directories
        Path(config.checkpoint_dir).mkdir(parents=True, exist_ok=True)
        Path(config.output_dir).mkdir(parents=True, exist_ok=True)
    
    def create_dataloader(self, max_samples: Optional[int] = None) -> DataLoader:
        """Create training dataloader"""
        dataset = LJSpeechDataset(
            self.config.data_path,
            self.config,
            max_samples=max_samples
        )
        
        return DataLoader(
            dataset,
            batch_size=self.config.batch_size,
            shuffle=True,
            collate_fn=collate_fn,
            num_workers=0,  # Windows compatibility
            pin_memory=True if self.device == 'cuda' else False
        )
    
    def compute_loss(
        self,
        mel_outputs: torch.Tensor,
        mel_outputs_postnet: torch.Tensor,
        gate_outputs: torch.Tensor,
        mel_target: torch.Tensor,
        gate_target: torch.Tensor
    ) -> Dict[str, torch.Tensor]:
        """Compute training losses"""
        # Mel losses
        mel_loss = self.mse_loss(mel_outputs, mel_target)
        mel_postnet_loss = self.mse_loss(mel_outputs_postnet, mel_target)
        
        # Gate loss
        gate_loss = self.bce_loss(gate_outputs, gate_target)
        
        # Total loss
        total_loss = mel_loss + mel_postnet_loss + gate_loss
        
        return {
            'total': total_loss,
            'mel': mel_loss,
            'mel_postnet': mel_postnet_loss,
            'gate': gate_loss
        }
    
    def train_step(self, batch: Dict[str, torch.Tensor]) -> Dict[str, float]:
        """Single training step"""
        self.model.train()
        self.optimizer.zero_grad()
        
        # Move to device
        text = batch['text'].to(self.device)
        text_lengths = batch['text_lengths'].to(self.device)
        mel = batch['mel'].to(self.device)
        mel_lengths = batch['mel_lengths'].to(self.device)
        gate = batch['gate'].to(self.device)
        
        # Forward pass
        mel_outputs, mel_outputs_postnet, gate_outputs, _ = self.model(
            text, text_lengths, mel, mel_lengths
        )
        
        # Compute loss
        losses = self.compute_loss(
            mel_outputs, mel_outputs_postnet, gate_outputs, mel, gate
        )
        
        # Backward pass
        losses['total'].backward()
        
        # Gradient clipping
        torch.nn.utils.clip_grad_norm_(
            self.model.parameters(),
            self.config.grad_clip_thresh
        )
        
        # Optimizer step
        self.optimizer.step()
        self.global_step += 1
        
        return {k: v.item() for k, v in losses.items()}
    
    def train_epoch(self, dataloader: DataLoader) -> float:
        """Train for one epoch"""
        total_loss = 0.0
        num_batches = 0
        
        pbar = tqdm(dataloader, desc=f"Epoch {self.epoch + 1}")
        for batch in pbar:
            losses = self.train_step(batch)
            total_loss += losses['total']
            num_batches += 1
            
            pbar.set_postfix({
                'loss': f"{losses['total']:.4f}",
                'mel': f"{losses['mel']:.4f}",
                'gate': f"{losses['gate']:.4f}"
            })
        
        avg_loss = total_loss / num_batches
        return avg_loss
    
    def save_checkpoint(self, path: str, is_best: bool = False):
        """Save model checkpoint"""
        checkpoint = {
            'epoch': self.epoch,
            'global_step': self.global_step,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'config': self.config,
            'best_loss': self.best_loss
        }
        torch.save(checkpoint, path)
        
        if is_best:
            best_path = os.path.join(self.config.output_dir, 'best_model.pt')
            torch.save(checkpoint, best_path)
            print(f"Saved best model to {best_path}")
    
    def load_checkpoint(self, path: str):
        """Load model checkpoint"""
        checkpoint = torch.load(path, map_location=self.device)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
        self.epoch = checkpoint['epoch']
        self.global_step = checkpoint['global_step']
        self.best_loss = checkpoint.get('best_loss', float('inf'))
        
        print(f"Loaded checkpoint from epoch {self.epoch}")
    
    def train(
        self,
        epochs: int,
        max_samples: Optional[int] = None,
        checkpoint_every: int = 10
    ):
        """Full training loop"""
        dataloader = self.create_dataloader(max_samples)
        
        print(f"\nStarting training for {epochs} epochs")
        print(f"Dataset size: {len(dataloader.dataset)}")
        print(f"Batch size: {self.config.batch_size}")
        print(f"Batches per epoch: {len(dataloader)}")
        print("-" * 50)
        
        losses = []
        
        for epoch in range(epochs):
            self.epoch = epoch
            
            # Train
            avg_loss = self.train_epoch(dataloader)
            losses.append(avg_loss)
            
            # Learning rate scheduler
            self.scheduler.step(avg_loss)
            
            # Log
            print(f"Epoch {epoch + 1}/{epochs} - Loss: {avg_loss:.4f} - LR: {self.optimizer.param_groups[0]['lr']:.2e}")
            
            # Save checkpoint
            is_best = avg_loss < self.best_loss
            if is_best:
                self.best_loss = avg_loss
            
            if (epoch + 1) % checkpoint_every == 0 or is_best:
                ckpt_path = os.path.join(
                    self.config.checkpoint_dir,
                    f'checkpoint_epoch_{epoch + 1}.pt'
                )
                self.save_checkpoint(ckpt_path, is_best)
        
        # Save final model
        final_path = os.path.join(self.config.output_dir, 'final_model.pt')
        self.save_checkpoint(final_path)
        print(f"\nTraining complete! Final model saved to {final_path}")
        
        # Plot loss curve
        self.plot_loss(losses)
        
        return losses
    
    def plot_loss(self, losses: list):
        """Plot and save loss curve"""
        plt.figure(figsize=(10, 5))
        plt.plot(losses)
        plt.xlabel('Epoch')
        plt.ylabel('Loss')
        plt.title('Training Loss')
        plt.grid(True)
        
        plot_path = os.path.join(self.config.output_dir, 'loss_curve.png')
        plt.savefig(plot_path)
        plt.close()
        print(f"Loss curve saved to {plot_path}")
