import { useState, useCallback, useRef, useEffect } from "react";

interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false); // Use ref to avoid stale closure
  const shouldRestartRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      options.onError?.("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
    }

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;
    shouldRestartRef.current = options.continuous ?? false;

    recognition.continuous = options.continuous ?? false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);
      
      if (finalTranscript) {
        options.onTranscript?.(finalTranscript);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      
      // Don't treat "no-speech" or "aborted" as fatal errors in continuous mode
      if (event.error === "no-speech" || event.error === "aborted") {
        // These are expected in continuous mode, just continue
        return;
      }
      
      if (event.error === "not-allowed") {
        setIsListening(false);
        shouldRestartRef.current = false;
        options.onError?.("Microphone access denied. Please enable it in your browser settings.");
      } else if (event.error === "network") {
        // Network error - the Web Speech API requires internet connection
        // It sends audio to cloud servers for processing
        setIsListening(false);
        shouldRestartRef.current = false;
        options.onError?.("Speech recognition requires an internet connection. Please check your network and try again.");
      } else if (event.error === "audio-capture") {
        setIsListening(false);
        shouldRestartRef.current = false;
        options.onError?.("No microphone detected. Please connect a microphone and try again.");
      } else if (event.error === "service-not-allowed") {
        setIsListening(false);
        shouldRestartRef.current = false;
        options.onError?.("Speech recognition service is not allowed. Please check your browser settings.");
      } else {
        options.onError?.("Voice input error: " + event.error + ". Please try again.");
      }
    };

    recognition.onend = () => {
      // Restart if continuous mode is active and we should restart
      if (shouldRestartRef.current && isListeningRef.current) {
        try {
          // Small delay before restarting to prevent rapid cycling
          setTimeout(() => {
            if (shouldRestartRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch (e) {
          console.error("Failed to restart recognition:", e);
          setIsListening(false);
          shouldRestartRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
      options.onError?.("Failed to start voice input. Please try again.");
    }
  }, [options]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors when stopping
        }
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
  };
}
