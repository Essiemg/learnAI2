import { useCallback, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Default to backend TTS (Piper)
  const [useChatterbox, setUseChatterbox] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const speakWithBrowser = useCallback((cleanText: string) => {
    // Fallback to browser's built-in speech synthesis
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsLoading(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      console.error("Speech synthesis error:", e);
      setIsSpeaking(false);
      setIsLoading(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(async (text: string) => {
    // Cancel any ongoing speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    window.speechSynthesis.cancel();

    // Clean up the text - remove excessive emojis and markdown
    const cleanText = text
      .replace(/[^\w\s.,!?'"()-:;\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText || cleanText.length < 2) return;

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    // Try Chatterbox TTS first
    if (useChatterbox) {
      try {
        const token = localStorage.getItem("token");

        // Use the /voice/tts endpoint from voice_routes_v2.py
        const response = await fetch(`${API_URL}/voice/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text: cleanText, emotion: "friendly" }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          // If Chatterbox is not available, fall back to browser TTS
          console.log("Chatterbox TTS not available, using browser TTS");
          setUseChatterbox(false);
          speakWithBrowser(cleanText);
          return;
        }

        // Create audio from the response
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
          setIsLoading(false);
        };

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          setIsSpeaking(false);
          setIsLoading(false);
          URL.revokeObjectURL(audioUrl);
          // Fall back to browser TTS
          speakWithBrowser(cleanText);
        };

        await audio.play();

      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("TTS request aborted");
        } else {
          console.error("Chatterbox TTS error, falling back to browser TTS:", error);
          // Fall back to browser TTS
          speakWithBrowser(cleanText);
        }
      }
    } else {
      // Use browser TTS as fallback
      speakWithBrowser(cleanText);
    }
  }, [useChatterbox, speakWithBrowser]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Stop browser speech synthesis
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  return { speak, stop, isSpeaking, isLoading };
}
