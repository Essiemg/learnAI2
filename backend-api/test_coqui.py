import os
import sys
import logging

# Add current directory to path
sys.path.append(os.getcwd())

from services import coqui_inference

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_coqui():
    print("Testing Coqui TTS...")
    text = "Hello, this is a test of the Coqui TTS system."
    output_path = "test_coqui_output.wav"
    
    try:
        audio_bytes, rate, duration = coqui_inference.generate_speech(text, output_path=output_path)
        print(f"Success! Generated {duration:.2f}s audio at {rate}Hz")
        print(f"Saved to {output_path}")
        print(f"Audio bytes: {len(audio_bytes)}")
        
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            print("Verified file exists and is not empty.")
        else:
            print("Error: File not found or empty.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_coqui()
