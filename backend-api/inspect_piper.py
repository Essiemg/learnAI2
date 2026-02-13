
import sys
import os
import logging

sys.path.append(os.getcwd())

from services.piper_inference import piper_tts

try:
    piper_tts.load_model()
    print("PiperVoice attributes:")
    print(dir(piper_tts.voice))
    
    import io
    buff = io.BytesIO()
    res = piper_tts.voice.synthesize("test", buff)
    print(f"synthesize return type: {type(res)}")
    print(f"Buffer size: {len(buff.getvalue())}")
    
except Exception as e:
    print(e)
