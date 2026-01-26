import { useState, useCallback, useRef, useEffect } from "react";
import type { EducationLevel } from "@/types/education";

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

interface UseGeminiLiveOptions {
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

export function useGeminiLive({ 
  gradeLevel, 
  educationLevel, 
  fieldOfStudy, 
  subjects, 
  onTranscript, 
  onError 
}: UseGeminiLiveOptions) {
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
          const encoded = encodeAudioForAPI(new Float32Array(inputData));
          wsRef.current.send(JSON.stringify({ type: "audio", data: encoded }));
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContext.destination);

      setIsListening(true);
      console.log("Microphone started");
    } catch (error) {
      console.error("Error starting microphone:", error);
      onError?.("Failed to access microphone. Please check permissions.");
    }
  }, [encodeAudioForAPI, isListening, onError]);

  // Stop microphone capture
  const stopMicrophone = useCallback(() => {
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

  // Connect to Gemini Live
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

    const wsUrl = `wss://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/gemini-live?${params.toString()}`;
    console.log("Connecting to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected to edge function");
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
            queueAudio(message.data);
            break;

          case "text":
            onTranscript?.(message.data, false);
            break;

          case "turn_complete":
            setIsProcessing(false);
            break;

          case "interrupted":
            audioQueueRef.current = [];
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
