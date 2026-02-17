import { useState, useCallback, useEffect } from "react";
import { quizApi, QuizSession as ApiQuizSession } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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
      const data = await quizApi.getSessions();

      const formatted: QuizSession[] = data.map((s) => ({
        id: s.id,
        topic: s.topic,
        questions: parseQuestions(s.questions),
        answers: parseAnswers(s.answers),
        score: s.score || null,
        is_completed: s.completed,
        created_at: s.created_at,
        updated_at: s.created_at,
      }));

      setSessions(formatted);
    } catch (error) {
      console.error("Error loading quiz sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const parseQuestions = (json: any[]): Question[] => {
    if (!Array.isArray(json)) return [];
    return json.map((q: any, idx) => ({
      id: q.id || `q-${idx}`,
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correct_answer || q.correctAnswer || 0,
      explanation: q.explanation || "",
    }));
  };

  const parseAnswers = (json: any): Record<string, number> => {
    if (Array.isArray(json)) {
      // Convert array of answers to record
      const record: Record<string, number> = {};
      json.forEach((answer, idx) => {
        record[`q-${idx}`] = answer;
      });
      return record;
    }
    if (typeof json !== "object" || json === null) return {};
    return json as Record<string, number>;
  };

  const saveSession = useCallback(
    async (
      topic: string,
      questions: Question[],
      answers: Record<string, number>,
      score: number | null,
      isCompleted: boolean,
      sessionId?: string
    ) => {
      if (!user || questions.length === 0) return null;

      try {
        let currentSessionId = sessionId;

        // If no session ID provided, generate a new one (legacy behavior fallback)
        if (!currentSessionId) {
          const session = await quizApi.generate(topic, questions.length || 5);
          currentSessionId = session.id;
        }

        // If there are answers to submit
        if (isCompleted && Object.keys(answers).length > 0) {
          const answerArray = questions.map((q) => answers[q.id] || 0);
          await quizApi.submit(currentSessionId, answerArray);
        }

        await loadSessions();
        return currentSessionId;
      } catch (error) {
        console.error("Error saving quiz session:", error);
        return null;
      }
    },
    [user, loadSessions]
  );

  const saveProgress = useCallback(
    async (sessionId: string, questions: Question[], answers: Record<string, number>) => {
      try {
        const answerArray = questions.map((q) => answers[q.id] || 0);
        await quizApi.updateProgress(sessionId, answerArray);
      } catch (error) {
        console.error("Error saving progress:", error);
      }
    },
    []
  );

  const updateSession = useCallback(
    async (
      sessionId: string,
      answers: Record<string, number>,
      score: number | null,
      isCompleted: boolean
    ) => {
      try {
        if (isCompleted) {
          // Convert answers record to array
          const session = sessions.find(s => s.id === sessionId);
          if (session) {
            const answerArray = session.questions.map((q) => answers[q.id] || 0);
            await quizApi.submit(sessionId, answerArray);
          }
        }
        await loadSessions();
        return true;
      } catch (error) {
        console.error("Error updating quiz session:", error);
        return false;
      }
    },
    [loadSessions, sessions]
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
        await quizApi.deleteQuiz(sessionId);
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
    saveProgress,
    updateSession,
    loadSession,
    deleteSession,
    loadSessions,
  };
}
