import { useState, useCallback, useRef } from "react";
import { Message, ChatState } from "@/types/chat";
import type { EducationLevel } from "@/types/education";
import type { LearnerProfile } from "@/types/learningAnalytics";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-chat`;

interface UseChatOptions {
  gradeLevel: number;
  educationLevel?: EducationLevel;
  fieldOfStudy?: string | null;
  subjects?: string[];
  learnerProfile?: LearnerProfile;
  onInteraction?: (topic: string, message: string) => void;
}

export function useChat(options: UseChatOptions) {
  const { gradeLevel, educationLevel, fieldOfStudy, subjects, learnerProfile, onInteraction } = options;
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

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

        const response = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            gradeLevel,
            educationLevel,
            fieldOfStudy,
            subjects,
            imageData,
            learnerProfile,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get response");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        const assistantId = crypto.randomUUID();

        // Add empty assistant message
        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: assistantId,
              role: "assistant",
              content: "",
              timestamp: new Date(),
            },
          ],
        }));

        let textBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                setState((prev) => ({
                  ...prev,
                  messages: prev.messages.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantContent } : m
                  ),
                }));
              }
            } catch {
              // Incomplete JSON, put back and wait
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        setState((prev) => ({ ...prev, isLoading: false }));
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
    [gradeLevel, educationLevel, fieldOfStudy, subjects, learnerProfile, onInteraction, state.messages]
  );

  const clearMessages = useCallback(() => {
    setState({ messages: [], isLoading: false, error: null });
  }, []);

  const setMessages = useCallback((messages: Message[]) => {
    setState((prev) => ({ ...prev, messages }));
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
