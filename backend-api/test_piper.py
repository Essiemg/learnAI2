
import sys
import os
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add parent directory to path
sys.path.append(os.getcwd())

try:
    from services.piper_inference import piper_tts
    
    logger.info("Starting Piper TTS test...")
    
    text = "Hello! I am Toki, your AI tutor. I am testing my new voice capabilities using Piper."
    
    logger.info(f"Generating audio for: '{text}'")
    
    # Measure time
    start_time = time.time()
    
    # Generate audio
    audio_bytes, sample_rate, duration = piper_tts.generate(text)
    
    end_time = time.time()
    processing_time = end_time - start_time
    
    logger.info(f"Generation complete!")
    logger.info(f"Processing Time: {processing_time:.4f} seconds")
    logger.info(f"Audio Duration: {duration:.2f} seconds")
    logger.info(f"Real-time Factor: {processing_time / duration:.2f}x (lower is better)")
    logger.info(f"Sample Rate: {sample_rate} Hz")
    logger.info(f"Audio Size: {len(audio_bytes)} bytes")
    
    # Save to file
    output_file = "test_piper_output.wav"
    with open(output_file, "wb") as f:
        f.write(audio_bytes)
        
    logger.info(f"Saved audio to: {os.path.abspath(output_file)}")
    print("Piper TTS Test PASSED")
    
except ImportError as e:
    logger.error(f"Import Error: {e}")
    sys.exit(1)
except Exception as e:
    logger.error(f"Test Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
