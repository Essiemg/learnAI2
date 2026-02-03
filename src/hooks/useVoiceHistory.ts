import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Message } from "@/types/chat";

interface VoiceSession {
  id: string;
  topic: string | null;
  messages: Message[];
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = "learnai_voice_history";

export function useVoiceHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      loadSessions();
    } else {
      setSessions([]);
    }
  }, [user]);

  const loadSessions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      const data = stored ? JSON.parse(stored) : [];
      // Restore Date objects for timestamps
      const formattedSessions: VoiceSession[] = data.map((s: any) => ({
        ...s,
        messages: s.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      }));
      setSessions(formattedSessions);
    } catch (error) {
      console.error("Error loading voice sessions:", error);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveSessionsLocal = useCallback(
    (newSessions: VoiceSession[]) => {
      if (!user) return;
      // Serialize dates properly
      const serialized = newSessions.map((s) => ({
        ...s,
        messages: s.messages.map((m) => ({
          ...m,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
        })),
      }));
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(serialized));
      setSessions(newSessions);
    },
    [user]
  );

  const startSession = useCallback(async () => {
    if (!user) return null;

    setSessionStartTime(new Date());

    const now = new Date().toISOString();
    const newSession: VoiceSession = {
      id: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      topic: null,
      messages: [],
      duration_seconds: 0,
      created_at: now,
      updated_at: now,
    };

    setCurrentSessionId(newSession.id);
    const newSessions = [newSession, ...sessions];
    saveSessionsLocal(newSessions);
    return newSession.id;
  }, [user, sessions, saveSessionsLocal]);

  const updateSession = useCallback(
    async (messages: Message[], topic?: string) => {
      if (!user || !currentSessionId) return false;

      const durationSeconds = sessionStartTime
        ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)
        : 0;

      try {
        const newSessions = sessions.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                messages,
                topic: topic || s.topic,
                duration_seconds: durationSeconds,
                updated_at: new Date().toISOString(),
              }
            : s
        );
        saveSessionsLocal(newSessions);
        return true;
      } catch (error) {
        console.error("Error updating voice session:", error);
        return false;
      }
    },
    [user, currentSessionId, sessionStartTime, sessions, saveSessionsLocal]
  );

  const endSession = useCallback(async (messages: Message[]) => {
    if (!currentSessionId || messages.length === 0) {
      // Delete empty session
      if (currentSessionId) {
        const newSessions = sessions.filter((s) => s.id !== currentSessionId);
        saveSessionsLocal(newSessions);
      }
      setCurrentSessionId(null);
      setSessionStartTime(null);
      return;
    }

    // Generate topic from first user message
    const firstUserMessage = messages.find((m) => m.role === "user");
    const topic = firstUserMessage?.content.slice(0, 50) || "Voice conversation";

    await updateSession(messages, topic);
    setCurrentSessionId(null);
    setSessionStartTime(null);
  }, [currentSessionId, updateSession, sessions, saveSessionsLocal]);

  const loadSession = useCallback(
    (sessionId: string): Message[] | null => {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        return session.messages;
      }
      return null;
    },
    [sessions]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        const newSessions = sessions.filter((s) => s.id !== sessionId);
        saveSessionsLocal(newSessions);
        return true;
      } catch (error) {
        console.error("Error deleting voice session:", error);
        return false;
      }
    },
    [sessions, saveSessionsLocal]
  );

  const getSessionSummary = useCallback((session: VoiceSession): string => {
    const userMessages = session.messages.filter((m) => m.role === "user");
    const assistantMessages = session.messages.filter((m) => m.role === "assistant");
    
    let summary = `Voice Conversation Summary:\n\n`;
    summary += `Duration: ${formatDuration(session.duration_seconds)}\n`;
    summary += `Messages: ${session.messages.length} (${userMessages.length} from you, ${assistantMessages.length} from assistant)\n\n`;
    summary += `Key Points:\n`;
    
    assistantMessages.slice(0, 3).forEach((m, i) => {
      summary += `${i + 1}. ${m.content.slice(0, 100)}...\n`;
    });
    
    return summary;
  }, []);

  return {
    sessions,
    currentSessionId,
    isLoading,
    startSession,
    updateSession,
    endSession,
    loadSession,
    deleteSession,
    getSessionSummary,
    loadSessions,
  };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
