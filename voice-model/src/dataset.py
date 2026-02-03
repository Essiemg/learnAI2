"""
Dataset and Audio Processing for TTS Training
"""
import torch
import torchaudio
import numpy as np
from pathlib import Path
from torch.utils.data import Dataset
from typing import Tuple, List, Optional
import librosa

from .config import TTSConfig, AudioConfig

class TextProcessor:
    """Convert text to character indices"""
    
    def __init__(self, config: TTSConfig):
        self.config = config
        self.pad_token = config.pad_token
        self.characters = config.characters
        
        # Create character to index mapping
        self.char_to_idx = {self.pad_token: 0}
        for i, char in enumerate(self.characters):
            self.char_to_idx[char] = i + 1
        
        self.idx_to_char = {v: k for k, v in self.char_to_idx.items()}
    
    def text_to_sequence(self, text: str) -> List[int]:
        """Convert text to sequence of character indices"""
        sequence = []
        for char in text:
            if char in self.char_to_idx:
                sequence.append(self.char_to_idx[char])
            # Skip unknown characters
        return sequence
    
    def sequence_to_text(self, sequence: List[int]) -> str:
        """Convert sequence back to text"""
        return ''.join(self.idx_to_char.get(idx, '') for idx in sequence)


class AudioProcessor:
    """Process audio to mel spectrograms"""
    
    def __init__(self, config: AudioConfig):
        self.config = config
        self.mel_transform = None
        self._init_mel_transform()
    
    def _init_mel_transform(self):
        """Initialize mel spectrogram transform"""
        self.mel_transform = torchaudio.transforms.MelSpectrogram(
            sample_rate=self.config.sample_rate,
            n_fft=self.config.n_fft,
            hop_length=self.config.hop_length,
            win_length=self.config.win_length,
            n_mels=self.config.n_mels,
            f_min=self.config.mel_fmin,
            f_max=self.config.mel_fmax,
        )
    
    def load_audio(self, audio_path: str) -> torch.Tensor:
        """Load and resample audio file"""
        waveform, sr = torchaudio.load(audio_path)
        
        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
        
        # Resample if needed
        if sr != self.config.sample_rate:
            resampler = torchaudio.transforms.Resample(sr, self.config.sample_rate)
            waveform = resampler(waveform)
        
        return waveform.squeeze(0)
    
    def audio_to_mel(self, waveform: torch.Tensor) -> torch.Tensor:
        """Convert waveform to mel spectrogram"""
        if waveform.dim() == 1:
            waveform = waveform.unsqueeze(0)
        
        mel = self.mel_transform(waveform)
        
        # Convert to log scale
        mel = torch.log(torch.clamp(mel, min=1e-5))
        
        return mel.squeeze(0)
    
    def normalize_mel(self, mel: torch.Tensor) -> torch.Tensor:
        """Normalize mel spectrogram"""
        mel = (mel - mel.mean()) / (mel.std() + 1e-8)
        return mel


class LJSpeechDataset(Dataset):
    """LJSpeech Dataset for TTS training"""
    
    def __init__(
        self,
        metadata_path: str,
        config: TTSConfig,
        max_samples: Optional[int] = None
    ):
        self.config = config
        self.text_processor = TextProcessor(config)
        self.audio_processor = AudioProcessor(config.audio)
        
        # Load metadata
        self.samples = self._load_metadata(metadata_path, max_samples)
        print(f"Loaded {len(self.samples)} samples")
    
    def _load_metadata(
        self,
        metadata_path: str,
        max_samples: Optional[int] = None
    ) -> List[Tuple[str, str]]:
        """Load metadata file"""
        samples = []
        metadata_path = Path(metadata_path)
        
        if not metadata_path.exists():
            raise FileNotFoundError(f"Metadata not found: {metadata_path}")
        
        with open(metadata_path, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                if max_samples and i >= max_samples:
                    break
                
                parts = line.strip().split('|')
                if len(parts) >= 2:
                    audio_path = parts[0]
                    text = parts[1]
                    
                    if Path(audio_path).exists():
                        samples.append((audio_path, text))
        
        return samples
    
    def __len__(self) -> int:
        return len(self.samples)
    
    def __getitem__(self, idx: int) -> dict:
        audio_path, text = self.samples[idx]
        
        # Process text
        text_sequence = self.text_processor.text_to_sequence(text)
        text_tensor = torch.LongTensor(text_sequence)
        
        # Process audio
        waveform = self.audio_processor.load_audio(audio_path)
        mel = self.audio_processor.audio_to_mel(waveform)
        mel = self.audio_processor.normalize_mel(mel)
        
        return {
            'text': text_tensor,
            'text_length': len(text_sequence),
            'mel': mel,
            'mel_length': mel.shape[1],
            'audio_path': audio_path
        }


def collate_fn(batch: List[dict]) -> dict:
    """Collate function for DataLoader"""
    # Get max lengths
    max_text_len = max(item['text_length'] for item in batch)
    max_mel_len = max(item['mel_length'] for item in batch)
    n_mels = batch[0]['mel'].shape[0]
    
    # Prepare tensors
    batch_size = len(batch)
    text_padded = torch.zeros(batch_size, max_text_len, dtype=torch.long)
    mel_padded = torch.zeros(batch_size, n_mels, max_mel_len)
    gate_padded = torch.zeros(batch_size, max_mel_len)
    
    text_lengths = torch.LongTensor([item['text_length'] for item in batch])
    mel_lengths = torch.LongTensor([item['mel_length'] for item in batch])
    
    for i, item in enumerate(batch):
        text_len = item['text_length']
        mel_len = item['mel_length']
        
        text_padded[i, :text_len] = item['text']
        mel_padded[i, :, :mel_len] = item['mel']
        gate_padded[i, mel_len-1:] = 1.0  # Gate target (1 at end)
    
    return {
        'text': text_padded,
        'text_lengths': text_lengths,
        'mel': mel_padded,
        'mel_lengths': mel_lengths,
        'gate': gate_padded
    }
