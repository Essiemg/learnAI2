import { useState, useCallback, useEffect } from "react";
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

const STORAGE_KEY = "learnai_diagram_history";

export function useDiagramHistory() {
  const { user } = useAuth();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadDiagrams();
    } else {
      setDiagrams([]);
    }
  }, [user]);

  const loadDiagrams = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      const data = stored ? JSON.parse(stored) : [];
      setDiagrams(data);
    } catch (error) {
      console.error("Error loading diagrams:", error);
      setDiagrams([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveDiagramsLocal = useCallback(
    (newDiagrams: Diagram[]) => {
      if (!user) return;
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newDiagrams));
      setDiagrams(newDiagrams);
    },
    [user]
  );

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
        const now = new Date().toISOString();
        const newDiagram: Diagram = {
          id: `diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: title || null,
          source_text: sourceText || null,
          diagram_type: diagramType,
          mermaid_code: mermaidCode,
          material_id: materialId || null,
          created_at: now,
          updated_at: now,
        };

        const newDiagrams = [newDiagram, ...diagrams];
        saveDiagramsLocal(newDiagrams);
        return newDiagram.id;
      } catch (error) {
        console.error("Error saving diagram:", error);
        return null;
      }
    },
    [user, diagrams, saveDiagramsLocal]
  );

  const deleteDiagram = useCallback(
    async (diagramId: string) => {
      try {
        const newDiagrams = diagrams.filter((d) => d.id !== diagramId);
        saveDiagramsLocal(newDiagrams);
        return true;
      } catch (error) {
        console.error("Error deleting diagram:", error);
        return false;
      }
    },
    [diagrams, saveDiagramsLocal]
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
