"""
TTS Inference - Generate speech from text
"""
import torch
import torchaudio
import numpy as np
from pathlib import Path
from typing import Optional, Tuple
import scipy.signal

from .config import TTSConfig
from .dataset import TextProcessor
from .model import Tacotron2


class GriffinLimVocoder:
    """Griffin-Lim vocoder for mel-to-audio conversion"""
    
    def __init__(self, config: TTSConfig, n_iter: int = 60):
        self.config = config
        self.n_iter = n_iter
        
        # Mel filterbank
        self.mel_basis = torchaudio.functional.melscale_fbanks(
            n_freqs=config.audio.n_fft // 2 + 1,
            f_min=config.audio.mel_fmin,
            f_max=config.audio.mel_fmax,
            n_mels=config.audio.n_mels,
            sample_rate=config.audio.sample_rate
        )
        
    def mel_to_audio(self, mel: torch.Tensor) -> np.ndarray:
        """Convert mel spectrogram to audio using Griffin-Lim"""
        # Denormalize (undo log and normalization)
        mel = mel.squeeze().cpu().numpy()
        mel = np.exp(mel)
        
        # Mel to linear spectrogram (pseudo-inverse)
        mel_basis_np = self.mel_basis.numpy().T
        linear = np.maximum(1e-10, np.dot(np.linalg.pinv(mel_basis_np), mel))
        
        # Griffin-Lim
        audio = self._griffin_lim(linear)
        
        return audio
    
    def _griffin_lim(self, spectrogram: np.ndarray) -> np.ndarray:
        """Griffin-Lim algorithm"""
        angles = np.exp(2j * np.pi * np.random.rand(*spectrogram.shape))
        
        for _ in range(self.n_iter):
            # Inverse STFT
            full_spec = spectrogram * angles
            audio = scipy.signal.istft(
                full_spec,
                fs=self.config.audio.sample_rate,
                nperseg=self.config.audio.win_length,
                noverlap=self.config.audio.win_length - self.config.audio.hop_length
            )[1]
            
            # Forward STFT
            _, _, new_spec = scipy.signal.stft(
                audio,
                fs=self.config.audio.sample_rate,
                nperseg=self.config.audio.win_length,
                noverlap=self.config.audio.win_length - self.config.audio.hop_length
            )
            
            angles = np.exp(1j * np.angle(new_spec[:spectrogram.shape[0], :]))
        
        return audio.astype(np.float32)


class TTSSynthesizer:
    """TTS Synthesizer for generating speech from text"""
    
    def __init__(
        self,
        model_path: str,
        config: Optional[TTSConfig] = None,
        device: Optional[str] = None
    ):
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Load checkpoint
        checkpoint = torch.load(model_path, map_location=self.device)
        
        # Get config
        if config is None:
            config = checkpoint.get('config', TTSConfig())
        self.config = config
        
        # Create model
        self.model = Tacotron2(config).to(self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.eval()
        
        # Text processor
        self.text_processor = TextProcessor(config)
        
        # Vocoder
        self.vocoder = GriffinLimVocoder(config)
        
        print(f"Loaded TTS model from {model_path}")
        print(f"Device: {self.device}")
    
    def synthesize(
        self,
        text: str,
        output_path: Optional[str] = None
    ) -> Tuple[np.ndarray, int]:
        """Generate speech from text"""
        # Convert text to sequence
        sequence = self.text_processor.text_to_sequence(text)
        text_tensor = torch.LongTensor([sequence]).to(self.device)
        
        # Generate mel spectrogram
        with torch.no_grad():
            mel, alignments = self.model.inference(text_tensor)
        
        # Convert to audio
        audio = self.vocoder.mel_to_audio(mel)
        
        # Normalize audio
        audio = audio / np.abs(audio).max() * 0.9
        
        # Save if path provided
        if output_path:
            self.save_audio(audio, output_path)
        
        return audio, self.config.audio.sample_rate
    
    def save_audio(self, audio: np.ndarray, path: str):
        """Save audio to file"""
        audio_tensor = torch.from_numpy(audio).unsqueeze(0)
        torchaudio.save(
            path,
            audio_tensor,
            self.config.audio.sample_rate
        )
        print(f"Audio saved to {path}")
    
    def synthesize_batch(
        self,
        texts: list,
        output_dir: str
    ) -> list:
        """Generate speech for multiple texts"""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        results = []
        for i, text in enumerate(texts):
            output_path = output_dir / f"output_{i:04d}.wav"
            audio, sr = self.synthesize(text, str(output_path))
            results.append({
                'text': text,
                'audio_path': str(output_path),
                'duration': len(audio) / sr
            })
        
        return results


def main():
    """Test inference"""
    import argparse
    
    parser = argparse.ArgumentParser(description="TTS Inference")
    parser.add_argument('--model', type=str, required=True, help='Path to model checkpoint')
    parser.add_argument('--text', type=str, required=True, help='Text to synthesize')
    parser.add_argument('--output', type=str, default='output.wav', help='Output audio path')
    args = parser.parse_args()
    
    # Create synthesizer
    synthesizer = TTSSynthesizer(args.model)
    
    # Generate speech
    audio, sr = synthesizer.synthesize(args.text, args.output)
    
    print(f"Generated {len(audio) / sr:.2f} seconds of audio")


if __name__ == "__main__":
    main()
