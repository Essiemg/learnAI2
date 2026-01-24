import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Material {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  extracted_text: string | null;
  created_at: string;
}

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
      const { data, error } = await supabase
        .from("uploaded_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (e) {
      console.error("Error fetching materials:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("study-materials")
        .createSignedUrl(filePath, 3600);
      
      if (error) throw error;
      return data.signedUrl;
    } catch (e) {
      console.error("Error getting signed URL:", e);
      return null;
    }
  };

  const deleteMaterial = async (id: string, filePath: string) => {
    try {
      await supabase.storage.from("study-materials").remove([filePath]);
      await supabase.from("uploaded_materials").delete().eq("id", id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
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
