"""
Voice routes - Text-to-Speech using Chatterbox TTS
"""
import os
import io
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db import get_db
from auth import get_current_user
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice"])

# Global model instances
_tts_model = None
_tts_model_type = None  # "turbo" or "standard"


class TTSRequest(BaseModel):
    """Request for text-to-speech synthesis."""
    text: str
    voice_prompt_path: Optional[str] = None  # Optional reference audio for voice cloning
    exaggeration: Optional[float] = 0.5  # 0.0-1.0, expressiveness
    cfg_weight: Optional[float] = 0.5  # 0.0-1.0, voice matching strength


class TTSResponse(BaseModel):
    """Response with audio URL or base64 data."""
    audio_url: Optional[str] = None
    audio_base64: Optional[str] = None
    sample_rate: int = 24000
    duration_seconds: Optional[float] = None


def load_tts_model(device: str = "cpu", model_type: str = "standard"):
    """
    Load the Chatterbox TTS model.
    
    Args:
        device: "cuda" for GPU, "cpu" for CPU
        model_type: "turbo" (faster, 350M, requires HF login) or "standard" (500M)
    """
    global _tts_model, _tts_model_type
    
    try:
        import torch
        
        # Determine device
        if device == "cuda" and not torch.cuda.is_available():
            logger.warning("CUDA requested but not available, falling back to CPU")
            device = "cpu"
        
        # Try standard model first (doesn't require HF login)
        if model_type == "standard":
            from chatterbox.tts import ChatterboxTTS
            logger.info(f"Loading Chatterbox TTS on {device}...")
            _tts_model = ChatterboxTTS.from_pretrained(device=device)
            _tts_model_type = "standard"
            logger.info("✓ Chatterbox TTS loaded successfully!")
        else:
            # Turbo model requires HuggingFace login
            try:
                from chatterbox.tts_turbo import ChatterboxTurboTTS
                logger.info(f"Loading Chatterbox Turbo TTS on {device}...")
                _tts_model = ChatterboxTurboTTS.from_pretrained(device=device)
                _tts_model_type = "turbo"
                logger.info("✓ Chatterbox Turbo TTS loaded successfully!")
            except Exception as turbo_error:
                logger.warning(f"Turbo model failed: {turbo_error}. Trying standard model...")
                from chatterbox.tts import ChatterboxTTS
                _tts_model = ChatterboxTTS.from_pretrained(device=device)
                _tts_model_type = "standard"
                logger.info("✓ Chatterbox TTS (standard) loaded as fallback!")
        
        return _tts_model
        
    except ImportError as e:
        logger.error(f"Chatterbox TTS not installed: {e}")
        logger.error("Install with: pip install chatterbox-tts")
        return None
    except Exception as e:
        logger.error(f"Failed to load Chatterbox TTS: {e}")
        return None


def get_tts_model():
    """Get or load the TTS model."""
    global _tts_model
    if _tts_model is None:
        load_tts_model(device="cpu", model_type="turbo")
    return _tts_model


def generate_speech(
    text: str,
    voice_prompt_path: Optional[str] = None,
    exaggeration: float = 0.5,
    cfg_weight: float = 0.5
) -> tuple:
    """
    Generate speech audio from text using Chatterbox.
    
    Returns:
        Tuple of (audio_bytes, sample_rate, duration)
    """
    global _tts_model, _tts_model_type
    
    model = get_tts_model()
    
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="TTS model not available. Please install chatterbox-tts."
        )
    
    try:
        import torch
        import torchaudio as ta
        
        # Clean text for TTS
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Empty text provided")
        
        # Generate audio
        if _tts_model_type == "turbo":
            # Turbo model - simpler API, supports paralinguistic tags
            if voice_prompt_path and os.path.exists(voice_prompt_path):
                wav = model.generate(clean_text, audio_prompt_path=voice_prompt_path)
            else:
                wav = model.generate(clean_text)
        else:
            # Standard model - supports exaggeration and cfg_weight
            if voice_prompt_path and os.path.exists(voice_prompt_path):
                wav = model.generate(
                    clean_text,
                    audio_prompt_path=voice_prompt_path,
                    exaggeration=exaggeration,
                    cfg_weight=cfg_weight
                )
            else:
                wav = model.generate(
                    clean_text,
                    exaggeration=exaggeration,
                    cfg_weight=cfg_weight
                )
        
        # Get sample rate from model
        sample_rate = model.sr
        
        # Convert to bytes (WAV format)
        buffer = io.BytesIO()
        ta.save(buffer, wav, sample_rate, format="wav")
        buffer.seek(0)
        audio_bytes = buffer.read()
        
        # Calculate duration
        duration = wav.shape[-1] / sample_rate
        
        return audio_bytes, sample_rate, duration
        
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@router.post("/synthesize")
async def synthesize_speech(
    request: TTSRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synthesize speech from text using Chatterbox TTS.
    Returns audio as a streaming WAV response.
    """
    if not request.text or len(request.text.strip()) < 1:
        raise HTTPException(status_code=400, detail="Text is required")
    
    if len(request.text) > 5000:
        raise HTTPException(status_code=400, detail="Text too long (max 5000 characters)")
    
    # Generate speech
    audio_bytes, sample_rate, duration = generate_speech(
        text=request.text,
        voice_prompt_path=request.voice_prompt_path,
        exaggeration=request.exaggeration or 0.5,
        cfg_weight=request.cfg_weight or 0.5
    )
    
    # Return as streaming audio response
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/wav",
        headers={
            "Content-Disposition": "attachment; filename=speech.wav",
            "X-Sample-Rate": str(sample_rate),
            "X-Duration-Seconds": str(round(duration, 2))
        }
    )


@router.post("/synthesize-base64", response_model=TTSResponse)
async def synthesize_speech_base64(
    request: TTSRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synthesize speech from text and return as base64-encoded audio.
    Useful for embedding in JSON responses.
    """
    import base64
    
    if not request.text or len(request.text.strip()) < 1:
        raise HTTPException(status_code=400, detail="Text is required")
    
    if len(request.text) > 5000:
        raise HTTPException(status_code=400, detail="Text too long (max 5000 characters)")
    
    # Generate speech
    audio_bytes, sample_rate, duration = generate_speech(
        text=request.text,
        voice_prompt_path=request.voice_prompt_path,
        exaggeration=request.exaggeration or 0.5,
        cfg_weight=request.cfg_weight or 0.5
    )
    
    # Convert to base64
    audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
    
    return TTSResponse(
        audio_base64=audio_base64,
        sample_rate=sample_rate,
        duration_seconds=round(duration, 2)
    )


@router.get("/status")
async def get_tts_status():
    """Check if TTS model is loaded and available."""
    global _tts_model, _tts_model_type
    
    if _tts_model is not None:
        return {
            "available": True,
            "model_type": _tts_model_type,
            "sample_rate": _tts_model.sr if hasattr(_tts_model, "sr") else 24000
        }
    
    # Try to check if chatterbox is installed
    try:
        import chatterbox
        return {
            "available": False,
            "model_loaded": False,
            "chatterbox_installed": True,
            "message": "Chatterbox installed but model not loaded"
        }
    except ImportError:
        return {
            "available": False,
            "model_loaded": False,
            "chatterbox_installed": False,
            "message": "Chatterbox TTS not installed. Install with: pip install chatterbox-tts"
        }


@router.post("/load-model")
async def load_model(
    device: str = "cpu",
    model_type: str = "turbo"
):
    """
    Manually load the TTS model.
    
    Args:
        device: "cuda" for GPU, "cpu" for CPU
        model_type: "turbo" (faster) or "standard" (more control)
    """
    model = load_tts_model(device=device, model_type=model_type)
    
    if model is None:
        raise HTTPException(
            status_code=500,
            detail="Failed to load TTS model. Check logs for details."
        )
    
    return {
        "status": "success",
        "model_type": model_type,
        "device": device
    }
