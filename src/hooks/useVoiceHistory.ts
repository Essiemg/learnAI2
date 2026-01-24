import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Message } from "@/types/chat";
import { Json } from "@/integrations/supabase/types";

interface VoiceSession {
  id: string;
  topic: string | null;
  messages: Message[];
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export function useVoiceHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

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
        .from("voice_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formattedSessions: VoiceSession[] = (data || []).map((s) => ({
        id: s.id,
        topic: s.topic,
        messages: parseMessages(s.messages),
        duration_seconds: s.duration_seconds || 0,
        created_at: s.created_at,
        updated_at: s.updated_at,
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error("Error loading voice sessions:", error);
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
    }));
  };

  const startSession = useCallback(async () => {
    if (!user) return null;

    setSessionStartTime(new Date());

    try {
      const { data, error } = await supabase
        .from("voice_sessions")
        .insert({
          user_id: user.id,
          messages: [] as Json,
          topic: null,
          duration_seconds: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSessionId(data.id);
      return data.id;
    } catch (error) {
      console.error("Error starting voice session:", error);
      return null;
    }
  }, [user]);

  const updateSession = useCallback(
    async (messages: Message[], topic?: string) => {
      if (!user || !currentSessionId) return false;

      const messagesJson = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      }));

      const durationSeconds = sessionStartTime
        ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)
        : 0;

      try {
        const { error } = await supabase
          .from("voice_sessions")
          .update({
            messages: messagesJson as Json,
            topic: topic || null,
            duration_seconds: durationSeconds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentSessionId);

        if (error) throw error;
        return true;
      } catch (error) {
        console.error("Error updating voice session:", error);
        return false;
      }
    },
    [user, currentSessionId, sessionStartTime]
  );

  const endSession = useCallback(async (messages: Message[]) => {
    if (!currentSessionId || messages.length === 0) {
      // Delete empty session
      if (currentSessionId) {
        await supabase.from("voice_sessions").delete().eq("id", currentSessionId);
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
    await loadSessions();
  }, [currentSessionId, updateSession, loadSessions]);

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
        const { error } = await supabase
          .from("voice_sessions")
          .delete()
          .eq("id", sessionId);

        if (error) throw error;
        await loadSessions();
        return true;
      } catch (error) {
        console.error("Error deleting voice session:", error);
        return false;
      }
    },
    [loadSessions]
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
