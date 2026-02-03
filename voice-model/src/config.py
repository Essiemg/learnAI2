"""
TTS Model Configuration
"""
from dataclasses import dataclass, field
from typing import List

@dataclass
class AudioConfig:
    """Audio processing configuration"""
    sample_rate: int = 22050
    n_fft: int = 1024
    hop_length: int = 256
    win_length: int = 1024
    n_mels: int = 80
    mel_fmin: float = 0.0
    mel_fmax: float = 8000.0
    max_wav_value: float = 32768.0
    
@dataclass
class ModelConfig:
    """Tacotron2 model configuration"""
    # Encoder
    encoder_embedding_dim: int = 512
    encoder_n_convolutions: int = 3
    encoder_kernel_size: int = 5
    
    # Attention
    attention_rnn_dim: int = 1024
    attention_dim: int = 128
    attention_location_n_filters: int = 32
    attention_location_kernel_size: int = 31
    
    # Decoder
    decoder_rnn_dim: int = 1024
    prenet_dim: int = 256
    max_decoder_steps: int = 1000
    gate_threshold: float = 0.5
    p_attention_dropout: float = 0.1
    p_decoder_dropout: float = 0.1
    
    # PostNet
    postnet_embedding_dim: int = 512
    postnet_kernel_size: int = 5
    postnet_n_convolutions: int = 5

@dataclass
class TTSConfig:
    """Complete TTS training configuration"""
    audio: AudioConfig = field(default_factory=AudioConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    
    # Text processing
    characters: str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?'-"
    pad_token: str = "_"
    
    # Training
    batch_size: int = 16
    learning_rate: float = 1e-3
    weight_decay: float = 1e-6
    epochs: int = 500
    grad_clip_thresh: float = 1.0
    
    # Paths
    data_path: str = "datasets/data/processed/metadata.txt"
    checkpoint_dir: str = "models/checkpoints"
    output_dir: str = "models/output"
    
    @property
    def vocab_size(self) -> int:
        return len(self.characters) + 1  # +1 for pad token
    
    @property
    def n_mels(self) -> int:
        return self.audio.n_mels
