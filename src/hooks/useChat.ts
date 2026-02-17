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
  onMessageSent?: (role: "user" | "assistant", content: string) => Promise<void>;
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
    // Handle quota exceeded by attempting to store fewer messages
    if (e instanceof Error && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
      console.warn("Storage quota exceeded, attempting to trim chat history...");
      try {
        const trimmed = messages.slice(-20).map((m) => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        }));
        sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
        return;
      } catch (retryErr) {
        console.error("Failed to persist even trimmed chat:", retryErr);
      }
    }
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
    async (content: string, imageData?: string, files?: { type: string; base64: string }[]) => {
      if (!content.trim() && !imageData && (!files || files.length === 0)) return;

      // Construct attachments list
      const attachments = [];
      if (imageData) {
        // Backward compatibility for single image
        attachments.push({ type: "image/png", content: imageData }); // Defaulting mime if unknown, but usually we know it
      }
      if (files) {
        attachments.push(...files.map(f => ({ type: f.type, content: f.base64 })));
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
        imageUrl: imageData || (files?.find(f => f.type.startsWith("image/"))?.base64),
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

      // Persist user message
      if (options.onMessageSent) {
        // We currently only persist text content in DB via this simple hook
        // File persistence would require a more complex DB schema change for ChatMessage
        // For now, we accept that files are ephemeral in terms of history loading, 
        // OR we'd need to update the addMessage endpoint too.
        // Let's stick to text persistence for now to avoid scope creep on DB schema.
        await options.onMessageSent("user", content.trim());
      }

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
          recent_accuracy: (learnerProfile as any)?.averageConfidence || 0.5,
          attachments: attachments.length > 0 ? attachments : undefined,
        });

        const assistantId = crypto.randomUUID();
        const assistantContent = response.answer;

        // Persist assistant message
        if (options.onMessageSent) {
          await options.onMessageSent("assistant", assistantContent);
        }

        // Add assistant message with the response
        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: assistantId,
              role: "assistant",
              content: assistantContent,
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
