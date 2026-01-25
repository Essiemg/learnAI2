import { useState, useCallback, useRef, useEffect } from "react";
import { useVoiceInput } from "./useVoiceInput";
import { useSpeech } from "./useSpeech";

interface UseLiveVoiceOptions {
  onUserSpeech: (text: string) => void;
  gradeLevel: number;
}

export function useLiveVoice({ onUserSpeech, gradeLevel }: UseLiveVoiceOptions) {
  // All useState hooks first
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // All useRef hooks
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");
  
  // All custom hooks - must be called unconditionally at top level
  const { speak, stop: stopSpeaking, isSpeaking, isLoading: isTTSLoading } = useSpeech();
  
  const { isListening, toggleListening, transcript } = useVoiceInput({
    onTranscript: (text: string) => {
      // Handle inline to avoid circular dependency
      lastTranscriptRef.current = text;
    },
    onError: (error) => console.error("Voice error:", error),
    continuous: true,
  });

  // Process transcript when it changes
  useEffect(() => {
    if (!isLiveMode || !transcript) return;
    
    // Clear any existing silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    lastTranscriptRef.current = transcript;

    // Set timeout to detect end of speech (1.5s of silence)
    silenceTimeoutRef.current = setTimeout(() => {
      if (lastTranscriptRef.current && !isProcessing) {
        setIsProcessing(true);
        onUserSpeech(lastTranscriptRef.current);
        lastTranscriptRef.current = "";
      }
    }, 1500);

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [transcript, isLiveMode, isProcessing, onUserSpeech]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  const startLiveMode = useCallback(() => {
    setIsLiveMode(true);
    if (!isListening) {
      toggleListening();
    }
  }, [isListening, toggleListening]);

  const stopLiveMode = useCallback(() => {
    setIsLiveMode(false);
    setIsProcessing(false);
    if (isListening) {
      toggleListening();
    }
    stopSpeaking();
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
  }, [isListening, toggleListening, stopSpeaking]);

  const toggleLiveMode = useCallback(() => {
    if (isLiveMode) {
      stopLiveMode();
    } else {
      startLiveMode();
    }
  }, [isLiveMode, startLiveMode, stopLiveMode]);

  const speakResponse = useCallback(
    (text: string) => {
      if (isLiveMode) {
        speak(text);
        setIsProcessing(false);
      }
    },
    [isLiveMode, speak]
  );

  return {
    isLiveMode,
    isListening,
    isSpeaking,
    isProcessing: isProcessing || isTTSLoading,
    toggleLiveMode,
    speakResponse,
    transcript,
  };
}
