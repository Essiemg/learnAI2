import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

export function useSummaryHistory() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSummaries();
    }
  }, [user]);

  const loadSummaries = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("summaries")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setSummaries(data || []);
    } catch (error) {
      console.error("Error loading summaries:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveSummary = useCallback(
    async (
      summaryText: string,
      title?: string,
      sourceText?: string,
      materialId?: string
    ) => {
      if (!user || !summaryText) return null;

      try {
        const { data, error } = await supabase
          .from("summaries")
          .insert({
            user_id: user.id,
            summary: summaryText,
            title: title || null,
            source_text: sourceText || null,
            material_id: materialId || null,
          })
          .select()
          .single();

        if (error) throw error;
        await loadSummaries();
        return data.id;
      } catch (error) {
        console.error("Error saving summary:", error);
        return null;
      }
    },
    [user, loadSummaries]
  );

  const deleteSummary = useCallback(
    async (summaryId: string) => {
      try {
        const { error } = await supabase
          .from("summaries")
          .delete()
          .eq("id", summaryId);

        if (error) throw error;
        await loadSummaries();
        return true;
      } catch (error) {
        console.error("Error deleting summary:", error);
        return false;
      }
    },
    [loadSummaries]
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
