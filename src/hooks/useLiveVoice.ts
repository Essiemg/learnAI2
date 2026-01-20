import { useState, useCallback, useRef, useEffect } from "react";
import { useVoiceInput } from "./useVoiceInput";
import { useSpeech } from "./useSpeech";

interface UseLiveVoiceOptions {
  onUserSpeech: (text: string) => void;
  gradeLevel: number;
}

export function useLiveVoice({ onUserSpeech, gradeLevel }: UseLiveVoiceOptions) {
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");
  
  const { speak, stop: stopSpeaking, isSpeaking } = useSpeech();

  const handleTranscript = useCallback(
    (text: string) => {
      if (!isLiveMode) return;
      
      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      lastTranscriptRef.current = text;

      // Set timeout to detect end of speech (1.5s of silence)
      silenceTimeoutRef.current = setTimeout(() => {
        if (lastTranscriptRef.current && !isProcessing) {
          setIsProcessing(true);
          onUserSpeech(lastTranscriptRef.current);
          lastTranscriptRef.current = "";
        }
      }, 1500);
    },
    [isLiveMode, isProcessing, onUserSpeech]
  );

  const { isListening, toggleListening, transcript } = useVoiceInput({
    onTranscript: handleTranscript,
    onError: (error) => console.error("Voice error:", error),
    continuous: true,
  });

  // Handle transcript updates
  useEffect(() => {
    if (isLiveMode && transcript) {
      handleTranscript(transcript);
    }
  }, [transcript, isLiveMode, handleTranscript]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  return {
    isLiveMode,
    isListening,
    isSpeaking,
    isProcessing,
    toggleLiveMode,
    speakResponse,
    transcript,
  };
}
