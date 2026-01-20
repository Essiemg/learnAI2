import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Json } from "@/integrations/supabase/types";

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

export function useEssayHistory() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubmissions();
    }
  }, [user]);

  const loadSubmissions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("essay_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: EssaySubmission[] = (data || []).map((s) => ({
        id: s.id,
        title: s.title,
        topic: s.topic,
        content: s.content,
        feedback: parseFeedback(s.feedback),
        overall_score: s.overall_score,
        created_at: s.created_at,
      }));

      setSubmissions(formatted);
    } catch (error) {
      console.error("Error loading essay submissions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const parseFeedback = (json: Json): EssayFeedback | null => {
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    const f = json as Record<string, any>;
    return {
      overallScore: f.overallScore || 0,
      categories: f.categories || [],
      strengths: f.strengths || [],
      improvements: f.improvements || [],
      detailedFeedback: f.detailedFeedback || "",
    };
  };

  const saveSubmission = useCallback(
    async (
      title: string | null,
      topic: string | null,
      content: string,
      feedback: EssayFeedback
    ) => {
      if (!user) return null;

      try {
        const { data, error } = await supabase
          .from("essay_submissions")
          .insert({
            user_id: user.id,
            title,
            topic,
            content,
            feedback: feedback as unknown as Json,
            overall_score: feedback.overallScore,
          })
          .select()
          .single();

        if (error) throw error;
        await loadSubmissions();
        return data.id;
      } catch (error) {
        console.error("Error saving essay submission:", error);
        return null;
      }
    },
    [user, loadSubmissions]
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
        const { error } = await supabase
          .from("essay_submissions")
          .delete()
          .eq("id", submissionId);

        if (error) throw error;
        await loadSubmissions();
        return true;
      } catch (error) {
        console.error("Error deleting submission:", error);
        return false;
      }
    },
    [loadSubmissions]
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
