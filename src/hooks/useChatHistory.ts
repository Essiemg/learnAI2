import { useState, useCallback, useEffect } from "react";
import { chatApi, ChatSession as ApiChatSession } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Message } from "@/types/chat";

interface ChatSession {
  id: string;
  topic: string | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

const SESSION_ID_STORAGE_KEY = "toki_current_session_id";

// Helper to load session ID from sessionStorage
function loadPersistedSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

// Helper to save session ID to sessionStorage
function persistSessionId(sessionId: string | null) {
  try {
    if (sessionId) {
      sessionStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
    } else {
      sessionStorage.removeItem(SESSION_ID_STORAGE_KEY);
    }
  } catch (e) {
    console.error("Failed to persist session ID:", e);
  }
}

export function useChatHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => loadPersistedSessionId());
  const [isLoading, setIsLoading] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await chatApi.getSessions();

      const formattedSessions: ChatSession[] = data.map((s) => ({
        id: s.id,
        topic: s.topic || null,
        messages: parseMessages(s.messages),
        created_at: s.created_at,
        updated_at: s.updated_at,
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error("Error loading chat sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const parseMessages = (json: any[]): Message[] => {
    if (!Array.isArray(json)) return [];
    return json.map((m: any) => ({
      id: m.id || crypto.randomUUID(),
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp || Date.now()),
      imageUrl: m.imageUrl,
    }));
  };

  const saveSession = useCallback(
    async (messages: Message[], topic?: string) => {
      if (!user || messages.length === 0) return null;

      try {
        if (currentSessionId) {
          // Add messages to existing session
          for (const m of messages) {
            await chatApi.addMessage(currentSessionId, m.role, m.content);
          }
          return currentSessionId;
        } else {
          // Create new session
          const session = await chatApi.createSession(topic);
          
          // Add messages
          for (const m of messages) {
            await chatApi.addMessage(session.id, m.role, m.content);
          }
          
          setCurrentSessionId(session.id);
          persistSessionId(session.id);
          await loadSessions();
          return session.id;
        }
      } catch (error) {
        console.error("Error saving chat session:", error);
        return null;
      }
    },
    [user, currentSessionId, loadSessions]
  );

  const loadSession = useCallback(
    (sessionId: string): Message[] | null => {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        setCurrentSessionId(sessionId);
        persistSessionId(sessionId);
        return session.messages;
      }
      return null;
    },
    [sessions]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await chatApi.deleteSession(sessionId);

        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
          persistSessionId(null);
        }

        await loadSessions();
        return true;
      } catch (error) {
        console.error("Error deleting session:", error);
        return false;
      }
    },
    [currentSessionId, loadSessions]
  );

  const startNewSession = useCallback(() => {
    setCurrentSessionId(null);
    persistSessionId(null);
  }, []);

  return {
    sessions,
    currentSessionId,
    isLoading,
    saveSession,
    loadSession,
    deleteSession,
    startNewSession,
    loadSessions,
  };
}
