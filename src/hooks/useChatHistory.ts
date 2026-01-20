import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Message } from "@/types/chat";
import { Json } from "@/integrations/supabase/types";

interface ChatSession {
  id: string;
  topic: string | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export function useChatHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
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
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formattedSessions: ChatSession[] = (data || []).map((s) => ({
        id: s.id,
        topic: s.topic,
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

  const parseMessages = (json: Json): Message[] => {
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

      const messagesJson = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        imageUrl: m.imageUrl,
      }));

      try {
        if (currentSessionId) {
          // Update existing session
          const { error } = await supabase
            .from("chat_sessions")
            .update({
              messages: messagesJson as Json,
              topic: topic || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", currentSessionId);

          if (error) throw error;
          return currentSessionId;
        } else {
          // Create new session
          const { data, error } = await supabase
            .from("chat_sessions")
            .insert({
              user_id: user.id,
              messages: messagesJson as Json,
              topic: topic || null,
            })
            .select()
            .single();

          if (error) throw error;
          
          setCurrentSessionId(data.id);
          await loadSessions();
          return data.id;
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
        return session.messages;
      }
      return null;
    },
    [sessions]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        const { error } = await supabase
          .from("chat_sessions")
          .delete()
          .eq("id", sessionId);

        if (error) throw error;

        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
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
