
import sys
import os

sys.path.append(os.getcwd())

from services.piper_inference import piper_tts

try:
    piper_tts.load_model()
    stream = piper_tts.voice.synthesize("t")
    chunk = next(stream)
    print(f"Chunk type: {type(chunk)}")
    print(f"Chunk dir: {dir(chunk)}")
except Exception as e:
    print(e)
