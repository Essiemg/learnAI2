import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Json } from "@/integrations/supabase/types";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardSession {
  id: string;
  topic: string;
  cards: Flashcard[];
  current_index: number;
  created_at: string;
  updated_at: string;
}

export function useFlashcardHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<FlashcardSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        .from("flashcard_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formatted: FlashcardSession[] = (data || []).map((s) => ({
        id: s.id,
        topic: s.topic,
        cards: parseCards(s.cards),
        current_index: s.current_index,
        created_at: s.created_at,
        updated_at: s.updated_at,
      }));

      setSessions(formatted);
    } catch (error) {
      console.error("Error loading flashcard sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const parseCards = (json: Json): Flashcard[] => {
    if (!Array.isArray(json)) return [];
    return json.map((c: any, idx) => ({
      id: c.id || `card-${idx}`,
      front: c.front,
      back: c.back,
    }));
  };

  const saveSession = useCallback(
    async (topic: string, cards: Flashcard[], currentIndex: number) => {
      if (!user || cards.length === 0) return null;

      const cardsJson = cards.map((c) => ({
        id: c.id,
        front: c.front,
        back: c.back,
      }));

      try {
        // Check if session for this topic exists
        const { data: existing } = await supabase
          .from("flashcard_sessions")
          .select("id")
          .eq("user_id", user.id)
          .eq("topic", topic)
          .single();

        if (existing) {
          const { error } = await supabase
            .from("flashcard_sessions")
            .update({
              cards: cardsJson as Json,
              current_index: currentIndex,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) throw error;
          await loadSessions();
          return existing.id;
        } else {
          const { data, error } = await supabase
            .from("flashcard_sessions")
            .insert({
              user_id: user.id,
              topic,
              cards: cardsJson as Json,
              current_index: currentIndex,
            })
            .select()
            .single();

          if (error) throw error;
          await loadSessions();
          return data.id;
        }
      } catch (error) {
        console.error("Error saving flashcard session:", error);
        return null;
      }
    },
    [user, loadSessions]
  );

  const loadSession = useCallback(
    (sessionId: string): FlashcardSession | null => {
      return sessions.find((s) => s.id === sessionId) || null;
    },
    [sessions]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        const { error } = await supabase
          .from("flashcard_sessions")
          .delete()
          .eq("id", sessionId);

        if (error) throw error;
        await loadSessions();
        return true;
      } catch (error) {
        console.error("Error deleting session:", error);
        return false;
      }
    },
    [loadSessions]
  );

  return {
    sessions,
    isLoading,
    saveSession,
    loadSession,
    deleteSession,
    loadSessions,
  };
}
