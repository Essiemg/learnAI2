import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Material {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  extracted_text: string | null;
  created_at: string;
  base64_data?: string;
}

const STORAGE_KEY = "learnai_materials";

export function useUploadedMaterials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMaterials = useCallback(async () => {
    if (!user) {
      setMaterials([]);
      return;
    }

    setIsLoading(true);
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      const data = stored ? JSON.parse(stored) : [];
      setMaterials(data);
    } catch (e) {
      console.error("Error fetching materials:", e);
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const saveMaterialsLocal = useCallback(
    (newMaterials: Material[]) => {
      if (!user) return;
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newMaterials));
      setMaterials(newMaterials);
    },
    [user]
  );

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    // For localStorage-based storage, we store base64 directly
    const material = materials.find((m) => m.file_path === filePath);
    return material?.base64_data || null;
  };

  const deleteMaterial = async (id: string, _filePath: string) => {
    try {
      const newMaterials = materials.filter((m) => m.id !== id);
      saveMaterialsLocal(newMaterials);
      return true;
    } catch (e) {
      console.error("Error deleting material:", e);
      return false;
    }
  };

  return {
    materials,
    isLoading,
    fetchMaterials,
    getSignedUrl,
    deleteMaterial,
  };
}
