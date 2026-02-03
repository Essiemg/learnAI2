import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export type VoiceEmotion = "friendly" | "excited" | "encouraging" | "calm" | "playful";
export type AgeGroup = "primary" | "middle_school" | "high_school" | "adult";

interface UseVoiceV2Options {
  defaultEmotion?: VoiceEmotion;
  ageGroup?: AgeGroup;
  autoFallbackToBrowser?: boolean;
}

interface TTSOptions {
  emotion?: VoiceEmotion;
  ageGroup?: AgeGroup;
}

interface STTResult {
  text: string;
  language: string;
}

interface VoiceConversationResult {
  userText: string;
  aiText: string;
  audioBase64: string;
  sampleRate: number;
  durationSeconds: number;
}

export function useVoiceV2(options: UseVoiceV2Options = {}) {
  const { 
    defaultEmotion = "friendly", 
    ageGroup,
    autoFallbackToBrowser = true 
  } = options;
  
  const { user } = useAuth();
  
  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [ttsAvailable, setTTSAvailable] = useState(true);
  
  // STT state
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sttAvailable, setSTTAvailable] = useState(true);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ============== TEXT TO SPEECH ==============
  const speakWithBrowser = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    
    // Try to use a friendly voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Google'))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsTTSLoading(false);
    };
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsTTSLoading(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(async (text: string, ttsOptions?: TTSOptions) => {
    // Cancel any ongoing speech
    stop();
    
    // Clean text
    const cleanText = text
      .replace(/[^\w\s.,!?'"()-:;\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText || cleanText.length < 2) return;

    setIsTTSLoading(true);
    abortControllerRef.current = new AbortController();

    if (ttsAvailable) {
      try {
        const token = localStorage.getItem("token");
        
        const response = await fetch(`${API_URL}/v2/voice/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ 
            text: cleanText,
            emotion: ttsOptions?.emotion || defaultEmotion,
            age_group: ttsOptions?.ageGroup || ageGroup,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          console.warn("TTS API not available, falling back to browser");
          setTTSAvailable(false);
          if (autoFallbackToBrowser) {
            speakWithBrowser(cleanText);
          }
          return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onplay = () => {
          setIsSpeaking(true);
          setIsTTSLoading(false);
        };
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          setIsTTSLoading(false);
          if (autoFallbackToBrowser) {
            speakWithBrowser(cleanText);
          }
        };
        
        await audio.play();
        
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error("TTS error:", error);
        setIsTTSLoading(false);
        if (autoFallbackToBrowser) {
          speakWithBrowser(cleanText);
        }
      }
    } else if (autoFallbackToBrowser) {
      speakWithBrowser(cleanText);
    }
  }, [ttsAvailable, defaultEmotion, ageGroup, autoFallbackToBrowser, speakWithBrowser]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsTTSLoading(false);
  }, []);

  // ============== SPEECH TO TEXT ==============
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setIsListening(true);
      
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw new Error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        setIsListening(false);
        mediaRecorderRef.current = null;
        
        resolve(audioBlob);
      };
      
      mediaRecorder.stop();
    });
  }, []);

  const transcribe = useCallback(async (audioBlob: Blob): Promise<STTResult> => {
    setIsTranscribing(true);
    
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/v2/voice/stt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          audio_base64: base64,
          language: "en",
        }),
      });
      
      if (!response.ok) {
        throw new Error("Transcription failed");
      }
      
      const result = await response.json();
      return {
        text: result.text,
        language: result.language,
      };
      
    } catch (error) {
      console.error("Transcription error:", error);
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const listenAndTranscribe = useCallback(async (): Promise<string> => {
    await startRecording();
    
    // Return a function that stops and transcribes
    return new Promise((resolve, reject) => {
      // This will be called when the user stops recording
      const handleStop = async () => {
        try {
          const audioBlob = await stopRecording();
          const result = await transcribe(audioBlob);
          resolve(result.text);
        } catch (error) {
          reject(error);
        }
      };
      
      // Store the handler for later use
      (window as any).__voiceStopHandler = handleStop;
    });
  }, [startRecording, stopRecording, transcribe]);

  const stopListening = useCallback(async (): Promise<string | null> => {
    try {
      const audioBlob = await stopRecording();
      const result = await transcribe(audioBlob);
      return result.text;
    } catch (error) {
      console.error("Stop listening error:", error);
      return null;
    }
  }, [stopRecording, transcribe]);

  // ============== FULL VOICE CONVERSATION ==============
  const voiceConversation = useCallback(async (
    audioBlob: Blob,
    context?: string
  ): Promise<VoiceConversationResult> => {
    setIsTranscribing(true);
    
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/v2/voice/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          audio_base64: base64,
          emotion: defaultEmotion,
          age_group: ageGroup,
          context,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Voice conversation failed");
      }
      
      const result = await response.json();
      
      // Play the response audio
      const audioBytes = Uint8Array.from(atob(result.audio_base64), c => c.charCodeAt(0));
      const responseBlob = new Blob([audioBytes], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(responseBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      
      return {
        userText: result.user_text,
        aiText: result.ai_text,
        audioBase64: result.audio_base64,
        sampleRate: result.sample_rate,
        durationSeconds: result.duration_seconds,
      };
      
    } catch (error) {
      console.error("Voice conversation error:", error);
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  }, [defaultEmotion, ageGroup]);

  // ============== CHECK STATUS ==============
  const checkStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/v2/voice/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        const status = await response.json();
        setTTSAvailable(status.tts?.loaded || false);
        setSTTAvailable(status.stt?.loaded || false);
        return status;
      }
    } catch (error) {
      console.warn("Voice status check failed:", error);
    }
    return null;
  }, []);

  return {
    // TTS
    speak,
    stop,
    isSpeaking,
    isTTSLoading,
    ttsAvailable,
    
    // STT
    startRecording,
    stopRecording,
    stopListening,
    transcribe,
    listenAndTranscribe,
    isListening,
    isRecording,
    isTranscribing,
    sttAvailable,
    
    // Full conversation
    voiceConversation,
    
    // Status
    checkStatus,
  };
}
