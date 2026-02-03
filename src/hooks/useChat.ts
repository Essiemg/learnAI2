import { useState, useCallback, useRef, useEffect } from "react";
import { Message, ChatState } from "@/types/chat";
import type { EducationLevel } from "@/types/education";
import type { LearnerProfile } from "@/types/learningAnalytics";
import { tutorApi, getToken } from "@/lib/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const CHAT_STORAGE_KEY = "toki_current_chat";

interface UseChatOptions {
  gradeLevel: number;
  educationLevel?: EducationLevel;
  fieldOfStudy?: string | null;
  subjects?: string[];
  learnerProfile?: LearnerProfile;
  userName?: string;
  onInteraction?: (topic: string, message: string) => void;
}

// Helper to load messages from sessionStorage
function loadPersistedMessages(): Message[] {
  try {
    const stored = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    }
  } catch (e) {
    console.error("Failed to load persisted chat:", e);
  }
  return [];
}

// Helper to save messages to sessionStorage
function persistMessages(messages: Message[]) {
  try {
    const toStore = messages.map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }));
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.error("Failed to persist chat:", e);
  }
}

// Helper to clear persisted messages
function clearPersistedMessages() {
  sessionStorage.removeItem(CHAT_STORAGE_KEY);
}

export function useChat(options: UseChatOptions) {
  const { gradeLevel, educationLevel, fieldOfStudy, subjects, learnerProfile, userName, onInteraction } = options;
  const [state, setState] = useState<ChatState>(() => ({
    messages: loadPersistedMessages(),
    isLoading: false,
    error: null,
  }));

  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist messages whenever they change
  useEffect(() => {
    if (state.messages.length > 0) {
      persistMessages(state.messages);
    }
  }, [state.messages]);

  const sendMessage = useCallback(
    async (content: string, imageData?: string) => {
      if (!content.trim() && !imageData) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
        imageUrl: imageData,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        error: null,
      }));

      // Track interaction for learning analytics
      if (onInteraction) {
        // Extract topic from message or use "general"
        const topic = extractTopic(content) || "general";
        onInteraction(topic, content);
      }

      // Prepare messages for API (last 10 for context)
      const apiMessages = state.messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      apiMessages.push({ role: "user" as const, content: content.trim() });

      try {
        abortControllerRef.current = new AbortController();
        
        // Extract topic from message
        const topic = extractTopic(content) || "general";

        // Call our backend tutor API
        const response = await tutorApi.getTutorResponse({
          subject: topic,
          question: content.trim(),
          mistakes: 0,
          time_spent: 0,
          frustration: 0,
          recent_accuracy: learnerProfile?.averageConfidence || 0.5,
        });

        const assistantId = crypto.randomUUID();

        // Add assistant message with the response
        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: assistantId,
              role: "assistant",
              content: response.answer,
              timestamp: new Date(),
            },
          ],
          isLoading: false,
        }));

      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        console.error("Chat error:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Something went wrong",
        }));
      }
    },
    [learnerProfile, onInteraction, state.messages]
  );

  const clearMessages = useCallback(() => {
    clearPersistedMessages();
    setState({ messages: [], isLoading: false, error: null });
  }, []);

  const setMessages = useCallback((messagesOrUpdater: Message[] | ((prev: Message[]) => Message[])) => {
    setState((prev) => {
      const newMessages = typeof messagesOrUpdater === 'function' 
        ? messagesOrUpdater(prev.messages) 
        : messagesOrUpdater;
      return { ...prev, messages: newMessages };
    });
  }, []);

  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    clearMessages,
    setMessages,
    cancelRequest,
  };
}

// Simple topic extraction from user message
function extractTopic(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Common subject keywords
  const subjects = [
    "math", "mathematics", "algebra", "geometry", "calculus",
    "science", "physics", "chemistry", "biology",
    "english", "writing", "reading", "grammar",
    "history", "geography", "social studies",
    "computer", "programming", "coding",
    "art", "music", "physical education",
  ];
  
  for (const subject of subjects) {
    if (lowerMessage.includes(subject)) {
      return subject;
    }
  }
  
  // Return first few words as topic
  return message.split(" ").slice(0, 3).join(" ");
}
