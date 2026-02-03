"""
Tacotron2 TTS Model
Sequence-to-sequence model for text-to-speech synthesis
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Optional

from .config import TTSConfig, ModelConfig


class ConvBlock(nn.Module):
    """Convolutional block with batch norm and ReLU"""
    
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int, dropout: float = 0.5):
        super().__init__()
        padding = (kernel_size - 1) // 2
        self.conv = nn.Conv1d(in_channels, out_channels, kernel_size, padding=padding)
        self.bn = nn.BatchNorm1d(out_channels)
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv(x)
        x = self.bn(x)
        x = F.relu(x)
        x = self.dropout(x)
        return x


class Encoder(nn.Module):
    """Tacotron2 Encoder - converts text to hidden representations"""
    
    def __init__(self, config: TTSConfig):
        super().__init__()
        self.embedding = nn.Embedding(
            config.vocab_size,
            config.model.encoder_embedding_dim
        )
        
        # Convolutional layers
        convolutions = []
        for i in range(config.model.encoder_n_convolutions):
            in_dim = config.model.encoder_embedding_dim
            convolutions.append(
                ConvBlock(in_dim, in_dim, config.model.encoder_kernel_size)
            )
        self.convolutions = nn.ModuleList(convolutions)
        
        # Bidirectional LSTM
        self.lstm = nn.LSTM(
            config.model.encoder_embedding_dim,
            config.model.encoder_embedding_dim // 2,
            num_layers=1,
            batch_first=True,
            bidirectional=True
        )
    
    def forward(self, text: torch.Tensor, text_lengths: torch.Tensor) -> torch.Tensor:
        # Embedding
        x = self.embedding(text)  # (B, T, D)
        x = x.transpose(1, 2)  # (B, D, T)
        
        # Convolutions
        for conv in self.convolutions:
            x = conv(x)
        
        x = x.transpose(1, 2)  # (B, T, D)
        
        # Pack and run LSTM
        x = nn.utils.rnn.pack_padded_sequence(
            x, text_lengths.cpu(), batch_first=True, enforce_sorted=False
        )
        x, _ = self.lstm(x)
        x, _ = nn.utils.rnn.pad_packed_sequence(x, batch_first=True)
        
        return x


class LocationSensitiveAttention(nn.Module):
    """Location-sensitive attention mechanism"""
    
    def __init__(self, config: ModelConfig, encoder_dim: int):
        super().__init__()
        self.query_layer = nn.Linear(config.attention_rnn_dim, config.attention_dim, bias=False)
        self.memory_layer = nn.Linear(encoder_dim, config.attention_dim, bias=False)
        self.v = nn.Linear(config.attention_dim, 1, bias=False)
        
        self.location_conv = nn.Conv1d(
            2, config.attention_location_n_filters,
            kernel_size=config.attention_location_kernel_size,
            padding=(config.attention_location_kernel_size - 1) // 2
        )
        self.location_dense = nn.Linear(
            config.attention_location_n_filters,
            config.attention_dim,
            bias=False
        )
        
        self.score_mask_value = -float('inf')
    
    def forward(
        self,
        attention_hidden: torch.Tensor,
        memory: torch.Tensor,
        attention_weights_cat: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        # Process query
        query = self.query_layer(attention_hidden.unsqueeze(1))
        
        # Process memory
        keys = self.memory_layer(memory)
        
        # Process location
        location_features = self.location_conv(attention_weights_cat)
        location_features = location_features.transpose(1, 2)
        location_features = self.location_dense(location_features)
        
        # Calculate attention energies
        energies = self.v(torch.tanh(query + keys + location_features))
        energies = energies.squeeze(-1)
        
        # Apply mask
        if mask is not None:
            energies = energies.masked_fill(mask, self.score_mask_value)
        
        # Softmax to get attention weights
        attention_weights = F.softmax(energies, dim=1)
        
        # Calculate context
        context = torch.bmm(attention_weights.unsqueeze(1), memory)
        context = context.squeeze(1)
        
        return context, attention_weights


class Prenet(nn.Module):
    """Prenet - processes mel frames before decoder"""
    
    def __init__(self, in_dim: int, out_dim: int):
        super().__init__()
        self.layers = nn.ModuleList([
            nn.Linear(in_dim, out_dim),
            nn.Linear(out_dim, out_dim)
        ])
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        for layer in self.layers:
            x = F.dropout(F.relu(layer(x)), p=0.5, training=True)  # Always dropout
        return x


class Decoder(nn.Module):
    """Tacotron2 Decoder - generates mel spectrograms from encoder output"""
    
    def __init__(self, config: TTSConfig):
        super().__init__()
        self.n_mels = config.n_mels
        self.max_decoder_steps = config.model.max_decoder_steps
        self.gate_threshold = config.model.gate_threshold
        
        encoder_dim = config.model.encoder_embedding_dim
        
        # Prenet
        self.prenet = Prenet(config.n_mels, config.model.prenet_dim)
        
        # Attention RNN
        self.attention_rnn = nn.LSTMCell(
            config.model.prenet_dim + encoder_dim,
            config.model.attention_rnn_dim
        )
        self.attention_dropout = nn.Dropout(config.model.p_attention_dropout)
        
        # Attention
        self.attention = LocationSensitiveAttention(config.model, encoder_dim)
        
        # Decoder RNN
        self.decoder_rnn = nn.LSTMCell(
            config.model.attention_rnn_dim + encoder_dim,
            config.model.decoder_rnn_dim
        )
        self.decoder_dropout = nn.Dropout(config.model.p_decoder_dropout)
        
        # Output projection
        self.linear = nn.Linear(
            config.model.decoder_rnn_dim + encoder_dim,
            config.n_mels
        )
        
        # Gate (stop token)
        self.gate = nn.Linear(
            config.model.decoder_rnn_dim + encoder_dim,
            1
        )
    
    def get_go_frame(self, memory: torch.Tensor) -> torch.Tensor:
        """Get initial decoder input (zeros)"""
        B = memory.size(0)
        return memory.new_zeros(B, self.n_mels)
    
    def initialize_states(
        self,
        memory: torch.Tensor
    ) -> Tuple[torch.Tensor, ...]:
        """Initialize decoder states"""
        B = memory.size(0)
        T = memory.size(1)
        
        attention_hidden = memory.new_zeros(B, self.attention_rnn.hidden_size)
        attention_cell = memory.new_zeros(B, self.attention_rnn.hidden_size)
        decoder_hidden = memory.new_zeros(B, self.decoder_rnn.hidden_size)
        decoder_cell = memory.new_zeros(B, self.decoder_rnn.hidden_size)
        
        attention_weights = memory.new_zeros(B, T)
        attention_weights_cum = memory.new_zeros(B, T)
        context = memory.new_zeros(B, memory.size(2))
        
        return (
            attention_hidden, attention_cell,
            decoder_hidden, decoder_cell,
            attention_weights, attention_weights_cum,
            context
        )
    
    def decode_step(
        self,
        decoder_input: torch.Tensor,
        states: Tuple[torch.Tensor, ...],
        memory: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, Tuple[torch.Tensor, ...]]:
        (
            attention_hidden, attention_cell,
            decoder_hidden, decoder_cell,
            attention_weights, attention_weights_cum,
            context
        ) = states
        
        # Prenet
        prenet_out = self.prenet(decoder_input)
        
        # Attention RNN
        attention_rnn_input = torch.cat([prenet_out, context], dim=1)
        attention_hidden, attention_cell = self.attention_rnn(
            attention_rnn_input, (attention_hidden, attention_cell)
        )
        attention_hidden = self.attention_dropout(attention_hidden)
        
        # Attention
        attention_weights_cat = torch.stack(
            [attention_weights, attention_weights_cum], dim=1
        )
        context, attention_weights = self.attention(
            attention_hidden, memory, attention_weights_cat, mask
        )
        attention_weights_cum = attention_weights_cum + attention_weights
        
        # Decoder RNN
        decoder_rnn_input = torch.cat([attention_hidden, context], dim=1)
        decoder_hidden, decoder_cell = self.decoder_rnn(
            decoder_rnn_input, (decoder_hidden, decoder_cell)
        )
        decoder_hidden = self.decoder_dropout(decoder_hidden)
        
        # Output projection
        decoder_output = torch.cat([decoder_hidden, context], dim=1)
        mel_output = self.linear(decoder_output)
        gate_output = self.gate(decoder_output)
        
        new_states = (
            attention_hidden, attention_cell,
            decoder_hidden, decoder_cell,
            attention_weights, attention_weights_cum,
            context
        )
        
        return mel_output, gate_output, new_states
    
    def forward(
        self,
        memory: torch.Tensor,
        mel_target: torch.Tensor,
        memory_lengths: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Training forward pass (teacher forcing)"""
        # Create mask
        max_len = memory.size(1)
        mask = torch.arange(max_len, device=memory.device).expand(
            memory.size(0), max_len
        ) >= memory_lengths.unsqueeze(1)
        
        # Prepend go frame
        go_frame = self.get_go_frame(memory)
        decoder_inputs = torch.cat([go_frame.unsqueeze(1), mel_target.transpose(1, 2)[:, :-1]], dim=1)
        
        # Initialize states
        states = self.initialize_states(memory)
        
        mel_outputs = []
        gate_outputs = []
        alignments = []
        
        for t in range(decoder_inputs.size(1)):
            decoder_input = decoder_inputs[:, t]
            mel_output, gate_output, states = self.decode_step(
                decoder_input, states, memory, mask
            )
            mel_outputs.append(mel_output)
            gate_outputs.append(gate_output)
            alignments.append(states[4])  # attention_weights
        
        mel_outputs = torch.stack(mel_outputs, dim=2)  # (B, n_mels, T)
        gate_outputs = torch.cat(gate_outputs, dim=1)  # (B, T)
        alignments = torch.stack(alignments, dim=1)  # (B, T_out, T_in)
        
        return mel_outputs, gate_outputs, alignments
    
    def inference(
        self,
        memory: torch.Tensor,
        memory_lengths: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Inference forward pass (autoregressive)"""
        # Create mask
        if memory_lengths is not None:
            max_len = memory.size(1)
            mask = torch.arange(max_len, device=memory.device).expand(
                memory.size(0), max_len
            ) >= memory_lengths.unsqueeze(1)
        else:
            mask = None
        
        # Initialize
        decoder_input = self.get_go_frame(memory)
        states = self.initialize_states(memory)
        
        mel_outputs = []
        gate_outputs = []
        alignments = []
        
        for _ in range(self.max_decoder_steps):
            mel_output, gate_output, states = self.decode_step(
                decoder_input, states, memory, mask
            )
            mel_outputs.append(mel_output)
            gate_outputs.append(gate_output)
            alignments.append(states[4])
            
            # Check stop condition
            if torch.sigmoid(gate_output).item() > self.gate_threshold:
                break
            
            decoder_input = mel_output
        
        mel_outputs = torch.stack(mel_outputs, dim=2)
        gate_outputs = torch.cat(gate_outputs, dim=1)
        alignments = torch.stack(alignments, dim=1)
        
        return mel_outputs, gate_outputs, alignments


class PostNet(nn.Module):
    """PostNet - refines mel spectrogram output"""
    
    def __init__(self, config: TTSConfig):
        super().__init__()
        
        convolutions = []
        # First conv
        convolutions.append(
            nn.Sequential(
                nn.Conv1d(
                    config.n_mels,
                    config.model.postnet_embedding_dim,
                    kernel_size=config.model.postnet_kernel_size,
                    padding=(config.model.postnet_kernel_size - 1) // 2
                ),
                nn.BatchNorm1d(config.model.postnet_embedding_dim),
                nn.Tanh(),
                nn.Dropout(0.5)
            )
        )
        
        # Middle convs
        for _ in range(config.model.postnet_n_convolutions - 2):
            convolutions.append(
                nn.Sequential(
                    nn.Conv1d(
                        config.model.postnet_embedding_dim,
                        config.model.postnet_embedding_dim,
                        kernel_size=config.model.postnet_kernel_size,
                        padding=(config.model.postnet_kernel_size - 1) // 2
                    ),
                    nn.BatchNorm1d(config.model.postnet_embedding_dim),
                    nn.Tanh(),
                    nn.Dropout(0.5)
                )
            )
        
        # Last conv
        convolutions.append(
            nn.Sequential(
                nn.Conv1d(
                    config.model.postnet_embedding_dim,
                    config.n_mels,
                    kernel_size=config.model.postnet_kernel_size,
                    padding=(config.model.postnet_kernel_size - 1) // 2
                ),
                nn.BatchNorm1d(config.n_mels),
                nn.Dropout(0.5)
            )
        )
        
        self.convolutions = nn.ModuleList(convolutions)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        for conv in self.convolutions:
            x = conv(x)
        return x


class Tacotron2(nn.Module):
    """Complete Tacotron2 TTS Model"""
    
    def __init__(self, config: TTSConfig):
        super().__init__()
        self.config = config
        
        self.encoder = Encoder(config)
        self.decoder = Decoder(config)
        self.postnet = PostNet(config)
    
    def forward(
        self,
        text: torch.Tensor,
        text_lengths: torch.Tensor,
        mel: torch.Tensor,
        mel_lengths: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """Training forward pass"""
        # Encode
        encoder_outputs = self.encoder(text, text_lengths)
        
        # Decode
        mel_outputs, gate_outputs, alignments = self.decoder(
            encoder_outputs, mel, text_lengths
        )
        
        # PostNet refinement
        mel_outputs_postnet = mel_outputs + self.postnet(mel_outputs)
        
        return mel_outputs, mel_outputs_postnet, gate_outputs, alignments
    
    def inference(self, text: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Inference forward pass"""
        text_lengths = torch.LongTensor([text.size(1)]).to(text.device)
        
        # Encode
        encoder_outputs = self.encoder(text, text_lengths)
        
        # Decode
        mel_outputs, gate_outputs, alignments = self.decoder.inference(
            encoder_outputs, text_lengths
        )
        
        # PostNet refinement
        mel_outputs_postnet = mel_outputs + self.postnet(mel_outputs)
        
        return mel_outputs_postnet, alignments
