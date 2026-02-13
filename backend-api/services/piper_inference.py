"""
Piper TTS Inference Service
===========================
Handles text-to-speech generation using Piper (ONNX).
Downloads voice models automatically if not present.
"""
import os
import logging
import json
import wave
import sys
from pathlib import Path

# Try to import piper, create a dummy wrapper if not available (to avoid crash during install phase)
try:
    from piper import PiperVoice
except ImportError:
    PiperVoice = None

logger = logging.getLogger(__name__)

class PiperTTS:
    _instance = None
    
    def __init__(self, model_name="en_US-amy-medium"):
        self.model_name = model_name
        self.models_dir = Path("models/piper")
        self.onnx_path = self.models_dir / f"{model_name}.onnx"
        self.config_path = self.models_dir / f"{model_name}.onnx.json"
        self.voice = None
        
        # Ensure models directory exists
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def _download_model(self):
        """Download model files if missing."""
        if self.onnx_path.exists() and self.config_path.exists():
            return

        logger.info(f"Downloading Piper model: {self.model_name}...")
        
        # URLs for the model (rhasspy/piper-voices on HF)
        # Using a fixed high-quality voice for now
        base_url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium"
        onnx_url = f"{base_url}/en_US-amy-medium.onnx"
        json_url = f"{base_url}/en_US-amy-medium.onnx.json"
        
        import requests
        
        try:
            # Download ONNX
            logger.info(f"Downloading {onnx_url}")
            r = requests.get(onnx_url)
            r.raise_for_status()
            with open(self.onnx_path, 'wb') as f:
                f.write(r.content)
                
            # Download Config
            logger.info(f"Downloading {json_url}")
            r = requests.get(json_url)
            r.raise_for_status()
            with open(self.config_path, 'wb') as f:
                f.write(r.content)
                
            logger.info("✅ Piper model downloaded successfully.")
            
        except Exception as e:
            logger.error(f"Failed to download Piper model: {e}")
            # Cleanup partial downloads
            if self.onnx_path.exists(): self.onnx_path.unlink()
            if self.config_path.exists(): self.config_path.unlink()
            raise e

    def load_model(self):
        """Load the Piper voice model."""
        if self.voice is not None:
            return

        if PiperVoice is None:
            logger.error("piper-tts package not installed!")
            # Fallback mock for when package is missing (during setup)
            return

        try:
            self._download_model()
            
            logger.info(f"Loading Piper voice from {self.onnx_path}...")
            # Load voice using piper-tts package
            # Note: PiperVoice expects the path to the onnx file
            self.voice = PiperVoice.load(str(self.onnx_path), config_path=str(self.config_path))
            
            logger.info("✅ Piper voice loaded!")
            
        except Exception as e:
            logger.error(f"Failed to load Piper voice: {e}")
            self.voice = None
            raise e

    def generate(self, text: str) -> tuple[bytes, int, float]:
        """
        Generate audio from text.
        
        Returns:
            (audio_bytes, sample_rate, duration_seconds)
        """
        if self.voice is None:
            self.load_model()
            
        if self.voice is None:
             raise RuntimeError("Piper TTS model could not be loaded")
             
        try:
            # Create a WAV file in memory
            import io
            wav_buffer = io.BytesIO()
            
            # 1. Get voice config
            sample_rate = self.voice.config.sample_rate
            num_channels = 1
            samp_width = 2  # 16-bit
            
            # 2. Synthesize
            # piper-tts synthesize returns a generator. We must iterate it.
            # It yields raw PCM audio bytes.
            audio_stream = self.voice.synthesize(text)
            
            with wave.open(wav_buffer, "wb") as wav_file:
                wav_file.setnchannels(num_channels)
                wav_file.setsampwidth(samp_width)
                wav_file.setframerate(sample_rate)
                
                for audio_chunk in audio_stream:
                    wav_file.writeframes(audio_chunk.audio_int16_bytes)
                
            audio_bytes = wav_buffer.getvalue()
            
            # Calculate duration
            # WAV header is 44 bytes. PCM data is the rest.
            data_len = len(audio_bytes) - 44
            num_samples = data_len / samp_width / num_channels
            duration = num_samples / sample_rate
            
            return audio_bytes, sample_rate, duration

        except Exception as e:
            logger.error(f"Piper generation failed: {e}")
            raise e

# Global instance
piper_tts = PiperTTS.get_instance()
