import { useState, useCallback, useRef, useEffect } from "react";
import type { EducationLevel } from "@/types/education";

// Use WebSocket URL from environment or default to localhost
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

interface UseLiveLectureOptions {
  gradeLevel: number;
  educationLevel?: EducationLevel;
  fieldOfStudy?: string | null;
  subjects?: string[];
  onTranscript?: (text: string, isUser: boolean) => void;
  onError?: (error: string) => void;
}

interface AudioQueueItem {
  data: Uint8Array;
}

// Browser TTS helper - used when server TTS is too slow
function speakWithBrowserTTS(text: string, onStart?: () => void, onEnd?: () => void) {
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const cleanText = text
    .replace(/[^\w\s.,!?'"()-:;\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  if (!cleanText || cleanText.length < 2) return;
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  
  window.speechSynthesis.speak(utterance);
}

/**
 * Hook for live lecture mode - real-time voice conversation with AI tutor.
 * 
 * This connects to the backend WebSocket endpoint for:
 * - Streaming audio from microphone to server
 * - Receiving transcribed user speech
 * - Receiving AI responses (text + audio)
 */
export function useGeminiLive({ 
  gradeLevel, 
  educationLevel, 
  fieldOfStudy, 
  subjects, 
  onTranscript, 
  onError 
}: UseLiveLectureOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<AudioQueueItem[]>([]);
  const isPlayingRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioTimeRef = useRef<number>(0);
  const hasAudioRef = useRef(false);
  const pendingTextRef = useRef<string | null>(null);
  const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create WAV from PCM data for playback
  const createWavFromPCM = useCallback((pcmData: Uint8Array): ArrayBuffer => {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // RIFF header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, totalSize - 8, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    // Copy PCM data
    const dataView = new Uint8Array(buffer, headerSize);
    dataView.set(pcmData);

    return buffer;
  }, []);

  // Play audio from queue
  const playNextAudio = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const item = audioQueueRef.current.shift()!;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const wavBuffer = createWavFromPCM(item.data);
      const audioBuffer = await audioContextRef.current.decodeAudioData(wavBuffer);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        playNextAudio();
      };

      source.start(0);
    } catch (error) {
      console.error("Error playing audio:", error);
      playNextAudio(); // Continue with next chunk
    }
  }, [createWavFromPCM]);

  // Add audio to queue
  const queueAudio = useCallback((base64Data: string) => {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    audioQueueRef.current.push({ data: bytes });

    if (!isPlayingRef.current) {
      playNextAudio();
    }
  }, [playNextAudio]);

  // Encode audio for sending to API
  const encodeAudioForAPI = useCallback((float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    return btoa(binary);
  }, []);

  // Start microphone capture
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      sourceRef.current = audioContext.createMediaStreamSource(stream);
      processorRef.current = audioContext.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && isListening) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Check if there's actual audio (not silence)
          const maxAmplitude = Math.max(...Array.from(inputData).map(Math.abs));
          const hasSound = maxAmplitude > 0.01; // Threshold for detecting speech
          
          if (hasSound) {
            hasAudioRef.current = true;
            lastAudioTimeRef.current = Date.now();
            
            // Clear any pending silence timeout
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
              silenceTimeoutRef.current = null;
            }
          }
          
          // Send audio to server
          const encoded = encodeAudioForAPI(new Float32Array(inputData));
          wsRef.current.send(JSON.stringify({ type: "audio", data: encoded }));
          
          // Check for silence after speech (1.5 seconds of silence = end of turn)
          if (hasAudioRef.current && !hasSound && !silenceTimeoutRef.current && !isProcessing) {
            silenceTimeoutRef.current = setTimeout(() => {
              if (wsRef.current?.readyState === WebSocket.OPEN && hasAudioRef.current) {
                console.log("Silence detected, sending end_turn");
                wsRef.current.send(JSON.stringify({ type: "end_turn" }));
                hasAudioRef.current = false;
                setIsProcessing(true);
              }
              silenceTimeoutRef.current = null;
            }, 1500);
          }
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContext.destination);

      setIsListening(true);
      hasAudioRef.current = false;
      console.log("Microphone started");
    } catch (error) {
      console.error("Error starting microphone:", error);
      onError?.("Failed to access microphone. Please check permissions.");
    }
  }, [encodeAudioForAPI, isListening, isProcessing, onError]);

  // Stop microphone capture
  const stopMicrophone = useCallback(() => {
    // Clear silence detection timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    hasAudioRef.current = false;
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
    console.log("Microphone stopped");
  }, []);

  // Connect to Live Lecture WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("Already connected");
      return;
    }

    setIsProcessing(true);

    // Build URL with education context
    const params = new URLSearchParams({ gradeLevel: String(gradeLevel) });
    if (educationLevel) params.append("educationLevel", educationLevel);
    if (fieldOfStudy) params.append("fieldOfStudy", fieldOfStudy);
    if (subjects && subjects.length > 0) params.append("subjects", subjects.join(","));

    const wsUrl = `${WS_URL}/ws/live-lecture?${params.toString()}`;
    console.log("Connecting to Live Lecture:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected to Live Lecture");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Received message type:", message.type);

        switch (message.type) {
          case "setup_complete":
            setIsConnected(true);
            setIsProcessing(false);
            startMicrophone();
            break;

          case "audio":
            // Clear the fallback timeout since we received audio
            if (audioTimeoutRef.current) {
              clearTimeout(audioTimeoutRef.current);
              audioTimeoutRef.current = null;
            }
            pendingTextRef.current = null;
            queueAudio(message.data);
            break;

          case "text":
            // AI response text - store it and start a fallback timer
            onTranscript?.(message.data, message.isUser === true);
            
            // If this is AI text (not user), set up fallback to browser TTS
            if (!message.isUser) {
              pendingTextRef.current = message.data;
              
              // Clear any existing timeout
              if (audioTimeoutRef.current) {
                clearTimeout(audioTimeoutRef.current);
              }
              
              // If no audio arrives in 2 seconds, use browser TTS
              audioTimeoutRef.current = setTimeout(() => {
                if (pendingTextRef.current) {
                  console.log("No server audio received, using browser TTS");
                  speakWithBrowserTTS(
                    pendingTextRef.current,
                    () => setIsSpeaking(true),
                    () => setIsSpeaking(false)
                  );
                  pendingTextRef.current = null;
                }
              }, 2000);
            }
            break;

          case "user_text":
            // Transcribed user speech
            onTranscript?.(message.data, true);
            break;

          case "turn_complete":
            setIsProcessing(false);
            break;

          case "interrupted":
            audioQueueRef.current = [];
            window.speechSynthesis.cancel(); // Also cancel browser TTS
            setIsSpeaking(false);
            break;

          case "error":
            onError?.(message.message || "Unknown error");
            setIsProcessing(false);
            break;
        }
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    };

    ws.onerror = (e) => {
      console.error("WebSocket error:", e);
      onError?.("Connection error. Please try again.");
      setIsProcessing(false);
    };

    ws.onclose = (e) => {
      console.log("WebSocket closed:", e.code, e.reason);
      setIsConnected(false);
      setIsProcessing(false);
      stopMicrophone();
    };
  }, [gradeLevel, educationLevel, fieldOfStudy, subjects, onError, onTranscript, queueAudio, startMicrophone, stopMicrophone]);

  // Disconnect from Gemini Live
  const disconnect = useCallback(() => {
    stopMicrophone();
    audioQueueRef.current = [];
    
    // Clear browser TTS fallback timeout
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
      audioTimeoutRef.current = null;
    }
    pendingTextRef.current = null;
    window.speechSynthesis.cancel();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
  }, [stopMicrophone]);

  // Toggle connection
  const toggle = useCallback(() => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  }, [isConnected, connect, disconnect]);

  // Send text message
  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsProcessing(true);
      wsRef.current.send(JSON.stringify({ type: "text", data: text }));
      onTranscript?.(text, true);
    }
  }, [onTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isSpeaking,
    isProcessing,
    connect,
    disconnect,
    toggle,
    sendText,
  };
}
