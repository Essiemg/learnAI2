import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Summary {
  id: string;
  title: string | null;
  source_text: string | null;
  summary: string;
  material_id: string | null;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = "learnai_summary_history";

export function useSummaryHistory() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSummaries();
    } else {
      setSummaries([]);
    }
  }, [user]);

  const loadSummaries = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      const data = stored ? JSON.parse(stored) : [];
      setSummaries(data);
    } catch (error) {
      console.error("Error loading summaries:", error);
      setSummaries([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveSummariesLocal = useCallback(
    (newSummaries: Summary[]) => {
      if (!user) return;
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newSummaries));
      setSummaries(newSummaries);
    },
    [user]
  );

  const saveSummary = useCallback(
    async (
      summaryText: string,
      title?: string,
      sourceText?: string,
      materialId?: string
    ) => {
      if (!user || !summaryText) return null;

      try {
        const now = new Date().toISOString();
        const newSummary: Summary = {
          id: `summary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: title || null,
          source_text: sourceText || null,
          summary: summaryText,
          material_id: materialId || null,
          created_at: now,
          updated_at: now,
        };

        const newSummaries = [newSummary, ...summaries];
        saveSummariesLocal(newSummaries);
        return newSummary.id;
      } catch (error) {
        console.error("Error saving summary:", error);
        return null;
      }
    },
    [user, summaries, saveSummariesLocal]
  );

  const deleteSummary = useCallback(
    async (summaryId: string) => {
      try {
        const newSummaries = summaries.filter((s) => s.id !== summaryId);
        saveSummariesLocal(newSummaries);
        return true;
      } catch (error) {
        console.error("Error deleting summary:", error);
        return false;
      }
    },
    [summaries, saveSummariesLocal]
  );

  const getSummary = useCallback(
    (summaryId: string): Summary | null => {
      return summaries.find((s) => s.id === summaryId) || null;
    },
    [summaries]
  );

  return {
    summaries,
    isLoading,
    saveSummary,
    deleteSummary,
    getSummary,
    loadSummaries,
  };
}
