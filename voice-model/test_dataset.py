"""Test dataset loading"""
import sys
sys.path.insert(0, '.')

from src.config import TTSConfig
from src.dataset import LJSpeechDataset

config = TTSConfig()
config.data_path = 'datasets/data/processed/metadata.txt'

print('Loading dataset...')
dataset = LJSpeechDataset(config.data_path, config, max_samples=5)
print(f'Dataset size: {len(dataset)}')

print('Loading sample 0...')
item = dataset[0]
print(f'Sample text length: {item["text_length"]}')
print(f'Sample mel shape: {item["mel"].shape}')

print('SUCCESS!')
