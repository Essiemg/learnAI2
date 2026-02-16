"""
Coqui TTS Inference Service
===========================
Handles text-to-speech generation using Coqui TTS (VITS).
"""
import os
import logging
import torch
import scipy.io.wavfile as scipy_wav
import numpy as np

# Configure logging
logger = logging.getLogger(__name__)

# Set environment variable for eSpeak-ng (Windows specific)
# This must be done before importing TTS or initializing phonemizer
if os.name == 'nt':
    espeak_path = r"C:\Program Files\eSpeak NG"
    espeak_lib = os.path.join(espeak_path, "libespeak-ng.dll")
    
    if os.path.exists(espeak_path):
        # Add to PATH
        os.environ["PATH"] += f";{espeak_path}"
        # Set phonemizer vars
        os.environ["PHONEMIZER_ESPEAK_PATH"] = espeak_path
        if os.path.exists(espeak_lib):
             os.environ["PHONEMIZER_ESPEAK_LIBRARY"] = espeak_lib
        
        logger.info(f"Updated PATH with {espeak_path}")

from TTS.api import TTS

# Global TTS model instance
_tts = None

# Model Configuration
MODEL_NAME = "tts_models/en/ljspeech/vits"  # Default single speaker VITS
GPU = torch.cuda.is_available()

def get_device():
    """Get the device to use for inference (cuda or cpu)."""
    return "cuda" if GPU else "cpu"

def load_model(model_name: str = MODEL_NAME):
    """
    Load the Coqui TTS model.
    """
    global _tts
    
    if _tts is not None:
        return _tts
        
    try:
        logger.info(f"Loading Coqui TTS model: {model_name} on {get_device()}...")
        
        # Initialize TTS with the model
        _tts = TTS(model_name=model_name, progress_bar=False, gpu=GPU)
        
        logger.info(f"✅ Coqui TTS model loaded successfully on {get_device()}")
        return _tts
        
    except ImportError:
        logger.error("Coqui TTS not installed. Install with: pip install TTS")
        return None
    except Exception as e:
        logger.error(f"Failed to load Coqui TTS model: {e}")
        return None

def generate_speech(
    text: str,
    output_path: str = None,
    emotion: str = None, # LJSpeech (VITS) doesn't support emotion, but keeping arg for consistency
    speaker: str = None, # LJSpeech is single speaker
    language: str = None, # English only
) -> tuple:
    """
    Generate speech from text.
    
    Args:
        text: Text to synthesize
        output_path: Path to save the WAV file (optional)
        emotion: Emotion (ignored for LJSpeech)
        speaker: Speaker ID (ignored for LJSpeech)
        language: Language ID (ignored for LJSpeech)
        
    Returns:
        Tuple of (audio_bytes, sample_rate, duration)
    """
    global _tts
    
    if _tts is None:
        load_model()
        if _tts is None:
            raise RuntimeError("TTS model could not be loaded")
            
    temp_file = None
    try:
        # Use a temporary file if no path provided
        if not output_path:
            fd, temp_file = tempfile.mkstemp(suffix=".wav")
            os.close(fd)
            output_path = temp_file
            
        logger.info(f"Generating speech for: '{text[:30]}...' -> {output_path}")
        
        # Generate speech to file directly
        # For VITS, we just pass text and path. 
        # Note: LJSpeech doesn't support speaker/language args.
        try:
            _tts.tts_to_file(text=text, file_path=output_path)
        except TypeError:
             # Try fallback if signature mismatch (some versions differ)
             logger.warning("Standard generation failed, trying alternate arguments...")
             _tts.tts_to_file(text=text, file_path=output_path, emotion=emotion)
        
        # Read the file to get byte content and metadata
        rate, data = scipy_wav.read(output_path)
        duration = len(data) / rate if rate > 0 else 0
        
        with open(output_path, "rb") as f:
            audio_bytes = f.read()
            
        return audio_bytes, rate, duration
        
    except Exception as e:
        logger.error(f"Speech generation failed: {e}")
        raise e
    finally:
        # Clean up temp file if we created one
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except:
                pass
