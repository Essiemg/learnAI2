import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { diagramApi, Diagram } from "@/lib/api";

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
      const data = await diagramApi.getDiagrams();
      setDiagrams(data);
    } catch (error) {
      console.error("Error loading diagrams:", error);
      setDiagrams([]);
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
      // Similar to summaries, manual creation is not yet fully supported by backend
      // without re-generation. We will rely on diagramApi.generate for now in the component.
      return null;
    },
    [user]
  );

  const deleteDiagram = useCallback(
    async (diagramId: string) => {
      try {
        await diagramApi.deleteDiagram(diagramId);
        setDiagrams(prev => prev.filter(d => d.id !== diagramId));
        return true;
      } catch (error) {
        console.error("Error deleting diagram:", error);
        await loadDiagrams();
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
