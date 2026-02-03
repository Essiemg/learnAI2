import { useState, useCallback, useEffect } from "react";
import { flashcardApi, FlashcardSession as ApiFlashcardSession } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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
      const data = await flashcardApi.getSessions();

      const formatted: FlashcardSession[] = data.map((s) => ({
        id: s.id,
        topic: s.topic,
        cards: parseCards(s.cards),
        current_index: s.current_index,
        created_at: s.created_at,
        updated_at: s.created_at,
      }));

      setSessions(formatted);
    } catch (error) {
      console.error("Error loading flashcard sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const parseCards = (json: any[]): Flashcard[] => {
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

      try {
        // Generate new flashcards via API
        const session = await flashcardApi.generate(topic, cards.length || 10);
        
        // Update index if needed
        if (currentIndex > 0) {
          await flashcardApi.updateIndex(session.id, currentIndex);
        }
        
        await loadSessions();
        return session.id;
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
        await flashcardApi.deleteSession(sessionId);
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
