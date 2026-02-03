# Voice Model Training Pipeline

Train your own Text-to-Speech (TTS) voice model from scratch using the Tacotron2 architecture.

## Architecture

This implementation uses **Tacotron2**, a sequence-to-sequence neural network for speech synthesis:

- **Encoder**: Converts character sequence to hidden representations using convolutional layers + bidirectional LSTM
- **Attention**: Location-sensitive attention for aligning text with audio frames
- **Decoder**: Autoregressive decoder that generates mel spectrograms
- **PostNet**: Convolutional network that refines the mel spectrogram
- **Vocoder**: Griffin-Lim algorithm for mel-to-audio conversion

## Dataset

Uses the **LJSpeech** dataset:
- 24 hours of audio
- 13,100 samples
- Single female speaker (Linda Johnson)
- Public domain
- ~2.6GB download

## Quick Start

### 1. Install Dependencies

```bash
cd voice-model
pip install -r requirements.txt
```

### 2. Download Dataset

```bash
# Full dataset (recommended)
python datasets/download_dataset.py ljspeech

# OR small subset for quick testing
python datasets/download_dataset.py ljspeech-small
```

### 3. Train the Model

```bash
# Quick test (50 epochs, 1000 samples, ~30 min on GPU)
python train_voice_model.py --quick

# Full training (500 epochs, all samples, ~12-24 hours on GPU)
python train_voice_model.py --epochs 500
```

### 4. Generate Speech

```python
from src.inference import TTSSynthesizer

# Load trained model
tts = TTSSynthesizer('models/output/best_model.pt')

# Generate speech
audio, sr = tts.synthesize("Hello, I am your AI tutor!", "output.wav")
```

## Training Options

```bash
python train_voice_model.py --help

Options:
  --epochs      Number of epochs (default: 500)
  --batch-size  Batch size (default: 16, reduce if OOM)
  --lr          Learning rate (default: 0.001)
  --quick       Quick test mode (50 epochs, 1000 samples)
  --resume      Resume from checkpoint
  --data-path   Path to metadata file
```

## Model Architecture Details

### Tacotron2 Components

1. **Character Embedding**: Maps characters to 512-dim vectors
2. **Encoder**:
   - 3 convolutional layers (512 filters, kernel size 5)
   - Bidirectional LSTM (256 units each direction)
3. **Attention**:
   - Location-sensitive attention (32 filters, kernel 31)
   - Query/Key projection (128 dim)
4. **Decoder**:
   - Prenet: 2 FC layers (256 dim) with dropout
   - Attention RNN: LSTM (1024 dim)
   - Decoder RNN: LSTM (1024 dim)
   - Linear projection to 80 mel channels
5. **PostNet**:
   - 5 convolutional layers (512 filters, kernel 5)
   - Residual connection

### Audio Processing

- Sample Rate: 22050 Hz
- FFT Size: 1024
- Hop Length: 256
- Mel Channels: 80
- Frequency Range: 0-8000 Hz

## File Structure

```
voice-model/
├── datasets/
│   ├── download_dataset.py  # Dataset downloader
│   └── data/                 # Downloaded data (created)
├── src/
│   ├── __init__.py
│   ├── config.py            # Configuration classes
│   ├── dataset.py           # Dataset and audio processing
│   ├── model.py             # Tacotron2 architecture
│   ├── train.py             # Training loop
│   └── inference.py         # Speech synthesis
├── models/
│   ├── checkpoints/         # Training checkpoints
│   └── output/              # Final models
├── train_voice_model.py     # Main training script
├── requirements.txt
└── README.md
```

## Tips for Training

1. **GPU Recommended**: Training on CPU is very slow (~50x slower)
2. **Reduce Batch Size**: If you get OOM errors, try `--batch-size 8` or `--batch-size 4`
3. **Monitor Loss**: Good models typically reach loss < 0.5
4. **Listen to Samples**: Generate test audio every 50 epochs to check quality
5. **Be Patient**: Good quality requires 200+ epochs

## Troubleshooting

### Out of Memory (OOM)
```bash
python train_voice_model.py --batch-size 8
```

### Slow Training
- Use GPU with CUDA
- Reduce `--epochs` for testing
- Use `--quick` mode first

### Poor Audio Quality
- Train for more epochs (500+)
- Check that dataset was downloaded correctly
- Ensure audio files exist in the data folder

## License

This training code is for educational purposes. The LJSpeech dataset is public domain.
