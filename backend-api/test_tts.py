
import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add parent directory to path
sys.path.append(os.getcwd())

try:
    from services.parler_inference import parler_tts
    
    logger.info("Starting TTS test...")
    
    text = "Hello! I am Toki, your AI tutor. I am testing my voice capabilities."
    description = "A friendly, energetic female voice speaking clearly."
    
    logger.info(f"Generating audio for: '{text}'")
    logger.info(f"Style: '{description}'")
    
    # Generate audio
    audio_bytes, sample_rate, duration = parler_tts.generate(text, description)
    
    logger.info(f"Generation complete!")
    logger.info(f"Sample Rate: {sample_rate} Hz")
    logger.info(f"Duration: {duration:.2f} seconds")
    logger.info(f"Audio Size: {len(audio_bytes)} bytes")
    
    # Save to file
    output_file = "test_tts_output.wav"
    with open(output_file, "wb") as f:
        f.write(audio_bytes)
        
    logger.info(f"Saved audio to: {os.path.abspath(output_file)}")
    print("TTS Test PASSED")
    
except ImportError as e:
    logger.error(f"Import Error: {e}")
    logger.error("Make sure you have installed: git+https://github.com/huggingface/parler-tts.git")
    sys.exit(1)
except Exception as e:
    logger.error(f"Test Failed: {e}")
    sys.exit(1)
