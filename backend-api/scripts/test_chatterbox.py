"""
Test script for Chatterbox TTS integration.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_chatterbox():
    """Test Chatterbox TTS model loading and synthesis."""
    print("=" * 60)
    print("Chatterbox TTS Test")
    print("=" * 60)
    
    # Check if chatterbox is installed
    print("\n[1] Checking Chatterbox installation...")
    try:
        import chatterbox
        print("   ✓ Chatterbox is installed")
    except ImportError:
        print("   ✗ Chatterbox is NOT installed")
        print("   Run: pip install chatterbox-tts")
        return
    
    # Check torchaudio
    print("\n[2] Checking torchaudio...")
    try:
        import torchaudio as ta
        print(f"   ✓ torchaudio version: {ta.__version__}")
    except ImportError:
        print("   ✗ torchaudio is NOT installed")
        print("   Run: pip install torchaudio")
        return
    
    # Check torch
    print("\n[3] Checking PyTorch...")
    try:
        import torch
        print(f"   ✓ PyTorch version: {torch.__version__}")
        print(f"   CUDA available: {torch.cuda.is_available()}")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"   Using device: {device}")
    except ImportError:
        print("   ✗ PyTorch is NOT installed")
        return
    
    # Try loading Chatterbox Turbo model
    print("\n[4] Loading Chatterbox Turbo TTS model...")
    print("   (This may take a while on first run as models are downloaded)")
    start = time.time()
    
    try:
        from chatterbox.tts_turbo import ChatterboxTurboTTS
        
        model = ChatterboxTurboTTS.from_pretrained(device=device)
        load_time = time.time() - start
        print(f"   ✓ Model loaded in {load_time:.2f}s")
        print(f"   Sample rate: {model.sr} Hz")
    except Exception as e:
        print(f"   ✗ Failed to load model: {e}")
        print("\n   Trying standard Chatterbox TTS...")
        try:
            from chatterbox.tts import ChatterboxTTS
            model = ChatterboxTTS.from_pretrained(device=device)
            print(f"   ✓ Standard model loaded")
        except Exception as e2:
            print(f"   ✗ Failed to load standard model: {e2}")
            return
    
    # Test speech synthesis
    print("\n[5] Testing speech synthesis...")
    test_text = "Hello! I am your AI learning assistant. How can I help you today?"
    print(f'   Text: "{test_text}"')
    
    start = time.time()
    try:
        wav = model.generate(test_text)
        gen_time = time.time() - start
        
        # Calculate duration
        duration = wav.shape[-1] / model.sr
        
        print(f"   ✓ Audio generated in {gen_time:.2f}s")
        print(f"   Duration: {duration:.2f}s")
        print(f"   Audio shape: {wav.shape}")
        
        # Save test audio
        output_path = "./test_speech.wav"
        ta.save(output_path, wav, model.sr)
        print(f"   ✓ Audio saved to: {output_path}")
        
    except Exception as e:
        print(f"   ✗ Speech synthesis failed: {e}")
        return
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print("✓ Chatterbox TTS is working correctly!")
    print(f"  - Model load time: {load_time:.2f}s")
    print(f"  - Synthesis time: {gen_time:.2f}s")
    print(f"  - Audio duration: {duration:.2f}s")
    print(f"  - Output file: {output_path}")
    print("=" * 60)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    test_chatterbox()
