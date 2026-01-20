import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Json } from "@/integrations/supabase/types";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizSession {
  id: string;
  topic: string;
  questions: Question[];
  answers: Record<string, number>;
  score: number | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function useQuizHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<QuizSession[]>([]);
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
        .from("quiz_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formatted: QuizSession[] = (data || []).map((s) => ({
        id: s.id,
        topic: s.topic,
        questions: parseQuestions(s.questions),
        answers: parseAnswers(s.answers),
        score: s.score,
        is_completed: s.is_completed,
        created_at: s.created_at,
        updated_at: s.updated_at,
      }));

      setSessions(formatted);
    } catch (error) {
      console.error("Error loading quiz sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const parseQuestions = (json: Json): Question[] => {
    if (!Array.isArray(json)) return [];
    return json.map((q: any, idx) => ({
      id: q.id || `q-${idx}`,
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));
  };

  const parseAnswers = (json: Json): Record<string, number> => {
    if (typeof json !== "object" || json === null || Array.isArray(json)) return {};
    return json as Record<string, number>;
  };

  const saveSession = useCallback(
    async (
      topic: string,
      questions: Question[],
      answers: Record<string, number>,
      score: number | null,
      isCompleted: boolean
    ) => {
      if (!user || questions.length === 0) return null;

      const questionsJson = questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }));

      try {
        const { data, error } = await supabase
          .from("quiz_sessions")
          .insert({
            user_id: user.id,
            topic,
            questions: questionsJson as Json,
            answers: answers as unknown as Json,
            score,
            is_completed: isCompleted,
          })
          .select()
          .single();

        if (error) throw error;
        await loadSessions();
        return data.id;
      } catch (error) {
        console.error("Error saving quiz session:", error);
        return null;
      }
    },
    [user, loadSessions]
  );

  const updateSession = useCallback(
    async (
      sessionId: string,
      answers: Record<string, number>,
      score: number | null,
      isCompleted: boolean
    ) => {
      try {
        const { error } = await supabase
          .from("quiz_sessions")
          .update({
            answers: answers as unknown as Json,
            score,
            is_completed: isCompleted,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        if (error) throw error;
        await loadSessions();
        return true;
      } catch (error) {
        console.error("Error updating quiz session:", error);
        return false;
      }
    },
    [loadSessions]
  );

  const loadSession = useCallback(
    (sessionId: string): QuizSession | null => {
      return sessions.find((s) => s.id === sessionId) || null;
    },
    [sessions]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        const { error } = await supabase
          .from("quiz_sessions")
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
    updateSession,
    loadSession,
    deleteSession,
    loadSessions,
  };
}
