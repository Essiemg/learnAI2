"""
Voice Routes V2 - Chatterbox TTS + OpenAI Whisper STT
Enhanced with emotion control and kid-friendly voice settings
Includes WebSocket support for live voice streaming
"""
import os
import io
import logging
import tempfile
import base64
import json
import asyncio
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from db import get_db
from auth import get_current_user
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice"])

# ============== GLOBAL STATE ==============
_tts_model = None
_tts_model_type = None
_stt_model = None
_stt_model_size = None


# ============== VOICE EMOTION PRESETS (for kids) ==============
VOICE_EMOTIONS = {
    "friendly": {
        "description": "Warm, welcoming, encouraging",
        "exaggeration": 0.6,
        "cfg_weight": 0.5,
        "text_prefix": "",  # No prefix needed
    },
    "excited": {
        "description": "Enthusiastic, celebrating success",
        "exaggeration": 0.8,
        "cfg_weight": 0.4,
        "text_prefix": "[excited] ",  # Chatterbox emotion tag
    },
    "encouraging": {
        "description": "Supportive, motivating after mistakes",
        "exaggeration": 0.5,
        "cfg_weight": 0.6,
        "text_prefix": "",
    },
    "calm": {
        "description": "Soothing, patient for difficult topics",
        "exaggeration": 0.3,
        "cfg_weight": 0.7,
        "text_prefix": "",
    },
    "playful": {
        "description": "Fun, engaging for young learners",
        "exaggeration": 0.7,
        "cfg_weight": 0.4,
        "text_prefix": "[playful] ",
    },
}

# Age-appropriate voice settings
AGE_VOICE_SETTINGS = {
    "primary": {  # 5-10 years
        "default_emotion": "playful",
        "speaking_rate": 0.9,  # Slightly slower
        "pitch_shift": 1.05,   # Slightly higher pitch
    },
    "middle_school": {  # 11-13 years
        "default_emotion": "friendly",
        "speaking_rate": 1.0,
        "pitch_shift": 1.0,
    },
    "high_school": {  # 14-18 years
        "default_emotion": "encouraging",
        "speaking_rate": 1.0,
        "pitch_shift": 1.0,
    },
    "adult": {  # 18+
        "default_emotion": "calm",
        "speaking_rate": 1.0,
        "pitch_shift": 1.0,
    },
}


# ============== PYDANTIC MODELS ==============
class TTSRequest(BaseModel):
    """Request for text-to-speech synthesis."""
    text: str = Field(..., min_length=1, max_length=5000)
    emotion: Optional[Literal["friendly", "excited", "encouraging", "calm", "playful"]] = "friendly"
    age_group: Optional[Literal["primary", "middle_school", "high_school", "adult"]] = None
    voice_prompt_path: Optional[str] = None
    exaggeration: Optional[float] = Field(None, ge=0.0, le=1.0)
    cfg_weight: Optional[float] = Field(None, ge=0.0, le=1.0)


class TTSResponse(BaseModel):
    """Response with audio data."""
    audio_base64: Optional[str] = None
    sample_rate: int = 24000
    duration_seconds: Optional[float] = None
    emotion_used: str = "friendly"


class STTRequest(BaseModel):
    """Request for speech-to-text transcription."""
    audio_base64: str
    language: Optional[str] = "en"


class STTResponse(BaseModel):
    """Response with transcribed text."""
    text: str
    language: str
    confidence: Optional[float] = None


class VoiceConversationRequest(BaseModel):
    """Full voice conversation: STT -> AI -> TTS"""
    audio_base64: str
    emotion: Optional[str] = "friendly"
    age_group: Optional[str] = None
    context: Optional[str] = None  # Previous conversation context


class VoiceConversationResponse(BaseModel):
    """Response with both text and audio."""
    user_text: str  # What the user said
    ai_text: str    # What the AI responds
    audio_base64: str  # AI response as audio
    sample_rate: int = 24000
    duration_seconds: float


# ============== TTS FUNCTIONS ==============
def load_tts_model(device: str = "cpu", model_type: str = "standard"):
    """Load Chatterbox TTS model."""
    global _tts_model, _tts_model_type
    
    if _tts_model is not None:
        return _tts_model
    
    try:
        import torch
        
        if device == "cuda" and not torch.cuda.is_available():
            logger.warning("CUDA not available, using CPU")
            device = "cpu"
        
        # Try standard model (more stable, doesn't require HF login)
        try:
            from chatterbox.tts import ChatterboxTTS
            logger.info(f"Loading Chatterbox TTS ({model_type}) on {device}...")
            _tts_model = ChatterboxTTS.from_pretrained(device=device)
            _tts_model_type = "standard"
            logger.info("✅ Chatterbox TTS loaded!")
            return _tts_model
        except Exception as e:
            logger.error(f"Failed to load Chatterbox: {e}")
            return None
            
    except ImportError as e:
        logger.error(f"Chatterbox not installed: {e}")
        return None


def get_tts_model():
    """Get or load TTS model."""
    global _tts_model
    if _tts_model is None:
        load_tts_model(device="cpu")
    return _tts_model


def generate_speech_with_emotion(
    text: str,
    emotion: str = "friendly",
    age_group: Optional[str] = None,
    voice_prompt_path: Optional[str] = None,
    custom_exaggeration: Optional[float] = None,
    custom_cfg_weight: Optional[float] = None,
) -> tuple:
    """
    Generate speech with emotion and age-appropriate settings.
    
    Returns:
        Tuple of (audio_bytes, sample_rate, duration)
    """
    global _tts_model
    
    model = get_tts_model()
    if model is None:
        raise HTTPException(status_code=503, detail="TTS model not available")
    
    try:
        import torch
        import torchaudio as ta
        
        # Get emotion settings
        emotion_settings = VOICE_EMOTIONS.get(emotion, VOICE_EMOTIONS["friendly"])
        
        # Override with age-specific settings if provided
        if age_group and age_group in AGE_VOICE_SETTINGS:
            age_settings = AGE_VOICE_SETTINGS[age_group]
            if emotion == "friendly":  # Use age-default only if no specific emotion
                emotion = age_settings["default_emotion"]
                emotion_settings = VOICE_EMOTIONS.get(emotion, VOICE_EMOTIONS["friendly"])
        
        # Prepare text with emotion prefix if available
        processed_text = emotion_settings.get("text_prefix", "") + text.strip()
        
        # Get exaggeration and cfg_weight
        exaggeration = custom_exaggeration if custom_exaggeration is not None else emotion_settings["exaggeration"]
        cfg_weight = custom_cfg_weight if custom_cfg_weight is not None else emotion_settings["cfg_weight"]
        
        # Generate audio
        if voice_prompt_path and os.path.exists(voice_prompt_path):
            wav = model.generate(
                processed_text,
                audio_prompt_path=voice_prompt_path,
                exaggeration=exaggeration,
                cfg_weight=cfg_weight
            )
        else:
            wav = model.generate(
                processed_text,
                exaggeration=exaggeration,
                cfg_weight=cfg_weight
            )
        
        sample_rate = model.sr
        
        # Convert to WAV bytes
        buffer = io.BytesIO()
        ta.save(buffer, wav, sample_rate, format="wav")
        buffer.seek(0)
        audio_bytes = buffer.read()
        
        duration = wav.shape[-1] / sample_rate
        
        return audio_bytes, sample_rate, duration, emotion
        
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


# ============== STT FUNCTIONS (Whisper) ==============
def load_stt_model(model_size: str = "base"):
    """Load OpenAI Whisper model for speech-to-text."""
    global _stt_model, _stt_model_size
    
    if _stt_model is not None and _stt_model_size == model_size:
        return _stt_model
    
    try:
        import whisper
        
        logger.info(f"Loading Whisper {model_size} model...")
        _stt_model = whisper.load_model(model_size)
        _stt_model_size = model_size
        logger.info(f"✅ Whisper {model_size} loaded!")
        return _stt_model
        
    except ImportError:
        logger.error("Whisper not installed. Install with: pip install openai-whisper")
        return None
    except Exception as e:
        logger.error(f"Failed to load Whisper: {e}")
        return None


def get_stt_model():
    """Get or load STT model."""
    global _stt_model
    if _stt_model is None:
        load_stt_model(model_size="base")
    return _stt_model


def transcribe_audio(audio_bytes: bytes, language: str = "en") -> dict:
    """
    Transcribe audio using Whisper.
    
    Returns:
        Dict with 'text', 'language', and 'segments'
    """
    model = get_stt_model()
    if model is None:
        raise HTTPException(status_code=503, detail="STT model not available")
    
    try:
        # Save audio to temp file (Whisper needs file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        try:
            # Transcribe
            result = model.transcribe(
                temp_path,
                language=language if language else None,
                task="transcribe"
            )
            
            return {
                "text": result["text"].strip(),
                "language": result.get("language", language),
                "segments": result.get("segments", [])
            }
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# ============== API ENDPOINTS ==============

@router.post("/tts", response_class=StreamingResponse)
async def text_to_speech(
    request: TTSRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Convert text to speech with emotion control.
    Returns WAV audio stream.
    """
    audio_bytes, sample_rate, duration, emotion_used = generate_speech_with_emotion(
        text=request.text,
        emotion=request.emotion or "friendly",
        age_group=request.age_group,
        voice_prompt_path=request.voice_prompt_path,
        custom_exaggeration=request.exaggeration,
        custom_cfg_weight=request.cfg_weight,
    )
    
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/wav",
        headers={
            "Content-Disposition": "attachment; filename=speech.wav",
            "X-Sample-Rate": str(sample_rate),
            "X-Duration-Seconds": str(round(duration, 2)),
            "X-Emotion": emotion_used,
        }
    )


@router.post("/tts/base64", response_model=TTSResponse)
async def text_to_speech_base64(
    request: TTSRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Convert text to speech, return as base64.
    """
    audio_bytes, sample_rate, duration, emotion_used = generate_speech_with_emotion(
        text=request.text,
        emotion=request.emotion or "friendly",
        age_group=request.age_group,
        voice_prompt_path=request.voice_prompt_path,
        custom_exaggeration=request.exaggeration,
        custom_cfg_weight=request.cfg_weight,
    )
    
    return TTSResponse(
        audio_base64=base64.b64encode(audio_bytes).decode("utf-8"),
        sample_rate=sample_rate,
        duration_seconds=round(duration, 2),
        emotion_used=emotion_used,
    )


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(
    request: STTRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe audio to text using Whisper.
    """
    try:
        audio_bytes = base64.b64decode(request.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio")
    
    result = transcribe_audio(audio_bytes, language=request.language)
    
    return STTResponse(
        text=result["text"],
        language=result["language"],
    )


@router.post("/stt/upload", response_model=STTResponse)
async def speech_to_text_upload(
    audio: UploadFile = File(...),
    language: str = Form("en"),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe uploaded audio file to text.
    """
    audio_bytes = await audio.read()
    result = transcribe_audio(audio_bytes, language=language)
    
    return STTResponse(
        text=result["text"],
        language=result["language"],
    )


@router.post("/conversation", response_model=VoiceConversationResponse)
async def voice_conversation(
    request: VoiceConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Full voice conversation flow:
    1. Transcribe user's audio (STT)
    2. Get AI response from tutor
    3. Convert response to speech (TTS)
    """
    # 1. Transcribe user audio
    try:
        audio_bytes = base64.b64decode(request.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio")
    
    stt_result = transcribe_audio(audio_bytes)
    user_text = stt_result["text"]
    
    if not user_text.strip():
        raise HTTPException(status_code=400, detail="Could not transcribe audio")
    
    # 2. Get AI response (import from tutor routes)
    try:
        from routers.tutor_routes import get_tutor_response
        ai_text = await get_tutor_response(
            message=user_text,
            context=request.context,
            user_id=current_user.id,
            db=db
        )
    except ImportError:
        # Fallback: simple echo response for testing
        ai_text = f"I heard you say: {user_text}. How can I help you learn today?"
    
    # 3. Convert AI response to speech
    audio_bytes, sample_rate, duration, _ = generate_speech_with_emotion(
        text=ai_text,
        emotion=request.emotion or "friendly",
        age_group=request.age_group,
    )
    
    return VoiceConversationResponse(
        user_text=user_text,
        ai_text=ai_text,
        audio_base64=base64.b64encode(audio_bytes).decode("utf-8"),
        sample_rate=sample_rate,
        duration_seconds=round(duration, 2),
    )


@router.get("/emotions")
async def list_emotions():
    """List available voice emotions and their settings."""
    return {
        "emotions": {
            name: {
                "description": settings["description"],
                "exaggeration": settings["exaggeration"],
                "cfg_weight": settings["cfg_weight"],
            }
            for name, settings in VOICE_EMOTIONS.items()
        },
        "age_groups": {
            name: {
                "default_emotion": settings["default_emotion"],
            }
            for name, settings in AGE_VOICE_SETTINGS.items()
        },
    }


@router.get("/status")
async def voice_status():
    """Check status of TTS and STT models."""
    global _tts_model, _tts_model_type, _stt_model, _stt_model_size
    
    tts_status = {
        "loaded": _tts_model is not None,
        "model_type": _tts_model_type,
        "sample_rate": _tts_model.sr if _tts_model and hasattr(_tts_model, "sr") else None,
    }
    
    stt_status = {
        "loaded": _stt_model is not None,
        "model_size": _stt_model_size,
    }
    
    # Check if libraries are installed
    try:
        import chatterbox
        tts_status["installed"] = True
    except ImportError:
        tts_status["installed"] = False
    
    try:
        import whisper
        stt_status["installed"] = True
    except ImportError:
        stt_status["installed"] = False
    
    return {
        "tts": tts_status,
        "stt": stt_status,
        "available_emotions": list(VOICE_EMOTIONS.keys()),
    }


@router.post("/load")
async def load_models(
    tts_device: str = "cpu",
    stt_model_size: str = "base",
):
    """Manually load TTS and STT models."""
    results = {}
    
    # Load TTS
    tts_model = load_tts_model(device=tts_device)
    results["tts"] = {
        "success": tts_model is not None,
        "device": tts_device,
    }
    
    # Load STT
    stt_model = load_stt_model(model_size=stt_model_size)
    results["stt"] = {
        "success": stt_model is not None,
        "model_size": stt_model_size,
    }
    
    return results


# ============== WEBSOCKET FOR LIVE VOICE LECTURE ==============

class LiveLectureSession:
    """Manages a single live lecture WebSocket session."""
    
    def __init__(
        self,
        websocket: WebSocket,
        grade_level: int = 5,
        education_level: str = "primary",
        field_of_study: Optional[str] = None,
        subjects: Optional[list] = None,
    ):
        self.websocket = websocket
        self.grade_level = grade_level
        self.education_level = education_level
        self.field_of_study = field_of_study
        self.subjects = subjects or []
        self.audio_buffer = bytearray()
        self.is_processing = False
        self.conversation_history = []
        
    def build_system_prompt(self) -> str:
        """Build a grade-appropriate system prompt."""
        grade_context = f"Grade {self.grade_level}" if self.grade_level <= 12 else "College level"
        
        subjects_text = ""
        if self.subjects:
            subjects_text = f"\nThe student is currently studying: {', '.join(self.subjects)}."
        
        field_text = ""
        if self.field_of_study:
            field_text = f"\nField of study: {self.field_of_study}."
        
        return f"""You are Toki, a friendly and encouraging AI tutor having a live voice conversation with a student.
    
CONTEXT:
- Education level: {self.education_level}
- Grade context: {grade_context}{subjects_text}{field_text}

VOICE CONVERSATION GUIDELINES:
- Keep responses SHORT and conversational (2-3 sentences max for speaking)
- Be warm, encouraging, and patient
- Use simple language appropriate for {grade_context}
- Ask clarifying questions to understand what they need help with
- Give hints and guide them to answers rather than giving direct solutions
- Celebrate their efforts and progress
- If they make a mistake, gently guide them in the right direction

Remember: This is a LIVE conversation, so be concise and natural!"""

    async def process_audio_chunk(self, audio_data: bytes):
        """Add audio to buffer for processing."""
        self.audio_buffer.extend(audio_data)
        
    async def transcribe_and_respond(self) -> Optional[dict]:
        """Transcribe buffered audio and generate response."""
        if len(self.audio_buffer) < 3200:  # Minimum audio needed (100ms at 16kHz 16-bit)
            return None
            
        self.is_processing = True
        
        try:
            # Convert buffer to bytes
            audio_bytes = bytes(self.audio_buffer)
            self.audio_buffer.clear()
            
            # Create WAV header for the raw PCM data
            wav_buffer = io.BytesIO()
            import struct
            
            # WAV header
            sample_rate = 16000
            bits_per_sample = 16
            num_channels = 1
            data_size = len(audio_bytes)
            
            wav_buffer.write(b'RIFF')
            wav_buffer.write(struct.pack('<I', 36 + data_size))
            wav_buffer.write(b'WAVE')
            wav_buffer.write(b'fmt ')
            wav_buffer.write(struct.pack('<I', 16))  # Subchunk1Size
            wav_buffer.write(struct.pack('<H', 1))   # AudioFormat (PCM)
            wav_buffer.write(struct.pack('<H', num_channels))
            wav_buffer.write(struct.pack('<I', sample_rate))
            wav_buffer.write(struct.pack('<I', sample_rate * num_channels * bits_per_sample // 8))
            wav_buffer.write(struct.pack('<H', num_channels * bits_per_sample // 8))
            wav_buffer.write(struct.pack('<H', bits_per_sample))
            wav_buffer.write(b'data')
            wav_buffer.write(struct.pack('<I', data_size))
            wav_buffer.write(audio_bytes)
            
            wav_bytes = wav_buffer.getvalue()
            
            # Transcribe using Whisper
            try:
                result = transcribe_audio(wav_bytes, language="en")
                user_text = result["text"].strip()
            except Exception as e:
                logger.error(f"Transcription error: {e}")
                return None
            
            if not user_text or len(user_text) < 2:
                return None
                
            logger.info(f"User said: {user_text}")
            
            # Add to conversation history
            self.conversation_history.append({"role": "user", "content": user_text})
            
            # Generate AI response using chat endpoint
            try:
                from routers.chat_routes import generate_chat_response
                
                ai_text = await generate_chat_response(
                    message=user_text,
                    grade_level=self.grade_level,
                    education_level=self.education_level,
                    field_of_study=self.field_of_study,
                    subjects=self.subjects,
                    conversation_history=self.conversation_history[-10:],  # Last 10 messages for context
                )
            except Exception as e:
                logger.error(f"Chat response error: {e}")
                # Fallback response
                ai_text = "I heard you! Could you please repeat that? I want to make sure I understand."
            
            logger.info(f"AI response: {ai_text}")
            
            # Add to conversation history
            self.conversation_history.append({"role": "assistant", "content": ai_text})
            
            # Generate TTS audio
            try:
                # Determine emotion based on content
                emotion = "friendly"
                if any(word in ai_text.lower() for word in ["great", "excellent", "awesome", "fantastic"]):
                    emotion = "excited"
                elif any(word in ai_text.lower() for word in ["let's try", "think about", "consider"]):
                    emotion = "encouraging"
                
                audio_bytes, sample_rate, duration, _ = generate_speech_with_emotion(
                    text=ai_text,
                    emotion=emotion,
                    age_group="primary" if self.grade_level <= 8 else "high_school" if self.grade_level <= 12 else "adult",
                )
                
                # Encode audio as base64
                audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
                
                return {
                    "user_text": user_text,
                    "ai_text": ai_text,
                    "audio": audio_base64,
                    "sample_rate": sample_rate,
                    "duration": duration,
                }
                
            except Exception as e:
                logger.error(f"TTS error: {e}")
                # Return text response without audio
                return {
                    "user_text": user_text,
                    "ai_text": ai_text,
                    "audio": None,
                }
                
        except Exception as e:
            logger.error(f"Process error: {e}")
            return None
        finally:
            self.is_processing = False


# Store active sessions
_live_sessions: dict[str, LiveLectureSession] = {}


def _generate_greeting(grade_level: int, education_level: str, subjects: list) -> str:
    """Generate a personalized greeting for the live lecture session."""
    import random
    
    # Time-based greeting
    from datetime import datetime
    hour = datetime.now().hour
    if hour < 12:
        time_greeting = "Good morning"
    elif hour < 17:
        time_greeting = "Good afternoon"
    else:
        time_greeting = "Good evening"
    
    # Age-appropriate greetings
    if grade_level <= 5:
        greetings = [
            f"{time_greeting}! I'm Toki, your learning buddy! What would you like to explore today?",
            f"Hey there, superstar! {time_greeting}! I'm Toki. What fun stuff should we learn today?",
            f"{time_greeting}! It's Toki here, ready to learn! What topic sounds exciting to you today?",
        ]
    elif grade_level <= 8:
        greetings = [
            f"{time_greeting}! I'm Toki, your study partner. What subject would you like to work on today?",
            f"Hey! {time_greeting}! I'm Toki. Ready to tackle something new? What do you want to study?",
            f"{time_greeting}! Toki here. What topic should we dive into today?",
        ]
    elif grade_level <= 12:
        greetings = [
            f"{time_greeting}! I'm Toki, here to help you learn. What would you like to focus on today?",
            f"Hey! {time_greeting}! I'm Toki. What subject or topic would you like to study today?",
            f"{time_greeting}! Ready to learn something awesome? What topic are you working on today?",
        ]
    else:
        greetings = [
            f"{time_greeting}! I'm Toki, your AI study assistant. What would you like to explore today?",
            f"Hey there! {time_greeting}! I'm Toki. What subject or concept would you like to discuss?",
            f"{time_greeting}! Toki here. What topic or assignment can I help you with today?",
        ]
    
    # Add subject hint if subjects are provided
    greeting = random.choice(greetings)
    
    if subjects and len(subjects) > 0:
        subject_hint = f" I see you're studying {', '.join(subjects[:2])}. Want to work on that, or something else?"
        # Only add hint sometimes to keep it natural
        if random.random() > 0.5:
            greeting = greeting.rstrip('?') + '?' + subject_hint
    
    return greeting


@router.websocket("/ws/live-lecture")
async def live_lecture_websocket(
    websocket: WebSocket,
    gradeLevel: int = 5,
    educationLevel: str = "primary",
    fieldOfStudy: Optional[str] = None,
    subjects: Optional[str] = None,
):
    """
    WebSocket endpoint for live voice lecture mode.
    
    Client sends:
    - { "type": "audio", "data": "<base64 PCM audio>" }
    - { "type": "text", "data": "<text message>" }
    - { "type": "end_turn" } - signals end of user speech
    
    Server sends:
    - { "type": "setup_complete" }
    - { "type": "text", "data": "<AI text response>", "isUser": false }
    - { "type": "user_text", "data": "<transcribed user speech>" }
    - { "type": "audio", "data": "<base64 WAV audio>" }
    - { "type": "turn_complete" }
    - { "type": "error", "message": "<error description>" }
    """
    await websocket.accept()
    
    session_id = str(id(websocket))
    subjects_list = subjects.split(",") if subjects else []
    
    session = LiveLectureSession(
        websocket=websocket,
        grade_level=gradeLevel,
        education_level=educationLevel,
        field_of_study=fieldOfStudy,
        subjects=subjects_list,
    )
    _live_sessions[session_id] = session
    
    logger.info(f"Live lecture session started: {session_id}")
    
    try:
        # Send setup complete
        await websocket.send_json({"type": "setup_complete"})
        
        # Generate personalized greeting
        greeting = _generate_greeting(gradeLevel, educationLevel, subjects_list)
        
        # Add greeting to conversation history
        session.conversation_history.append({"role": "assistant", "content": greeting})
        
        # Send greeting text
        await websocket.send_json({"type": "text", "data": greeting, "isUser": False})
        
        # Generate and send greeting audio
        try:
            audio_bytes, sample_rate, duration, _ = generate_speech_with_emotion(
                text=greeting,
                emotion="friendly",
                age_group="primary" if gradeLevel <= 8 else "high_school" if gradeLevel <= 12 else "adult",
            )
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
            await websocket.send_json({"type": "audio", "data": audio_base64})
        except Exception as e:
            logger.warning(f"TTS for greeting failed: {e}")
        
        await websocket.send_json({"type": "turn_complete"})
        
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                message = json.loads(data)
                
                msg_type = message.get("type")
                
                if msg_type == "audio":
                    # Decode and buffer audio
                    try:
                        audio_data = base64.b64decode(message.get("data", ""))
                        await session.process_audio_chunk(audio_data)
                    except Exception as e:
                        logger.error(f"Audio decode error: {e}")
                        
                elif msg_type == "text":
                    # Handle text input directly
                    text = message.get("data", "").strip()
                    if text:
                        session.conversation_history.append({"role": "user", "content": text})
                        await websocket.send_json({"type": "user_text", "data": text})
                        
                        # Generate response
                        try:
                            from routers.chat_routes import generate_chat_response
                            
                            ai_text = await generate_chat_response(
                                message=text,
                                grade_level=session.grade_level,
                                education_level=session.education_level,
                                field_of_study=session.field_of_study,
                                subjects=session.subjects,
                                conversation_history=session.conversation_history[-10:],
                            )
                        except Exception:
                            ai_text = "I'm here to help! What would you like to learn about?"
                        
                        session.conversation_history.append({"role": "assistant", "content": ai_text})
                        
                        await websocket.send_json({"type": "text", "data": ai_text, "isUser": False})
                        
                        # Generate audio response
                        try:
                            audio_bytes, sample_rate, duration, _ = generate_speech_with_emotion(
                                text=ai_text,
                                emotion="friendly",
                            )
                            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
                            await websocket.send_json({"type": "audio", "data": audio_base64})
                        except Exception as e:
                            logger.error(f"TTS error: {e}")
                        
                        await websocket.send_json({"type": "turn_complete"})
                        
                elif msg_type == "end_turn":
                    # Process accumulated audio
                    if not session.is_processing and len(session.audio_buffer) > 0:
                        result = await session.transcribe_and_respond()
                        
                        if result:
                            # Send user transcription
                            await websocket.send_json({
                                "type": "user_text", 
                                "data": result["user_text"]
                            })
                            
                            # Send AI text response
                            await websocket.send_json({
                                "type": "text",
                                "data": result["ai_text"],
                                "isUser": False
                            })
                            
                            # Send audio if available
                            if result.get("audio"):
                                await websocket.send_json({
                                    "type": "audio",
                                    "data": result["audio"]
                                })
                            
                            await websocket.send_json({"type": "turn_complete"})
                        else:
                            # No valid transcription, just complete the turn
                            session.audio_buffer.clear()
                            await websocket.send_json({"type": "turn_complete"})
                            
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                
    except WebSocketDisconnect:
        logger.info(f"Live lecture session disconnected: {session_id}")
    except Exception as e:
        logger.error(f"Live lecture error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        # Clean up session
        if session_id in _live_sessions:
            del _live_sessions[session_id]
        logger.info(f"Live lecture session cleaned up: {session_id}")
