import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Diagram {
  id: string;
  title: string | null;
  source_text: string | null;
  diagram_type: string;
  mermaid_code: string;
  material_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useDiagramHistory() {
  const { user } = useAuth();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadDiagrams();
    }
  }, [user]);

  const loadDiagrams = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("diagrams")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setDiagrams(data || []);
    } catch (error) {
      console.error("Error loading diagrams:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveDiagram = useCallback(
    async (
      mermaidCode: string,
      diagramType: string,
      title?: string,
      sourceText?: string,
      materialId?: string
    ) => {
      if (!user || !mermaidCode) return null;

      try {
        const { data, error } = await supabase
          .from("diagrams")
          .insert({
            user_id: user.id,
            mermaid_code: mermaidCode,
            diagram_type: diagramType,
            title: title || null,
            source_text: sourceText || null,
            material_id: materialId || null,
          })
          .select()
          .single();

        if (error) throw error;
        await loadDiagrams();
        return data.id;
      } catch (error) {
        console.error("Error saving diagram:", error);
        return null;
      }
    },
    [user, loadDiagrams]
  );

  const deleteDiagram = useCallback(
    async (diagramId: string) => {
      try {
        const { error } = await supabase
          .from("diagrams")
          .delete()
          .eq("id", diagramId);

        if (error) throw error;
        await loadDiagrams();
        return true;
      } catch (error) {
        console.error("Error deleting diagram:", error);
        return false;
      }
    },
    [loadDiagrams]
  );

  const getDiagram = useCallback(
    (diagramId: string): Diagram | null => {
      return diagrams.find((d) => d.id === diagramId) || null;
    },
    [diagrams]
  );

  return {
    diagrams,
    isLoading,
    saveDiagram,
    deleteDiagram,
    getDiagram,
    loadDiagrams,
  };
}
