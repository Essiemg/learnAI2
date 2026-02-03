import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface EssayFeedback {
  overallScore: number;
  categories: {
    name: string;
    score: number;
    feedback: string;
  }[];
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
}

interface EssaySubmission {
  id: string;
  title: string | null;
  topic: string | null;
  content: string;
  feedback: EssayFeedback | null;
  overall_score: number | null;
  created_at: string;
}

const STORAGE_KEY = "learnai_essay_history";

export function useEssayHistory() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubmissions();
    } else {
      setSubmissions([]);
    }
  }, [user]);

  const loadSubmissions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      const data = stored ? JSON.parse(stored) : [];
      setSubmissions(data);
    } catch (error) {
      console.error("Error loading essay submissions:", error);
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveSubmissions = useCallback(
    (newSubmissions: EssaySubmission[]) => {
      if (!user) return;
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newSubmissions));
      setSubmissions(newSubmissions);
    },
    [user]
  );

  const saveSubmission = useCallback(
    async (
      title: string | null,
      topic: string | null,
      content: string,
      feedback: EssayFeedback
    ) => {
      if (!user) return null;

      try {
        const newSubmission: EssaySubmission = {
          id: `essay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title,
          topic,
          content,
          feedback,
          overall_score: feedback.overallScore,
          created_at: new Date().toISOString(),
        };

        const newSubmissions = [newSubmission, ...submissions];
        saveSubmissions(newSubmissions);
        return newSubmission.id;
      } catch (error) {
        console.error("Error saving essay submission:", error);
        return null;
      }
    },
    [user, submissions, saveSubmissions]
  );

  const loadSubmission = useCallback(
    (submissionId: string): EssaySubmission | null => {
      return submissions.find((s) => s.id === submissionId) || null;
    },
    [submissions]
  );

  const deleteSubmission = useCallback(
    async (submissionId: string) => {
      try {
        const newSubmissions = submissions.filter((s) => s.id !== submissionId);
        saveSubmissions(newSubmissions);
        return true;
      } catch (error) {
        console.error("Error deleting submission:", error);
        return false;
      }
    },
    [submissions, saveSubmissions]
  );

  return {
    submissions,
    isLoading,
    saveSubmission,
    loadSubmission,
    deleteSubmission,
    loadSubmissions,
  };
}
