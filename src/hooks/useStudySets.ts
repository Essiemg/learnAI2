import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StudySet {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Material {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  extracted_text: string | null;
  study_set_id: string | null;
  source_url: string | null;
  created_at: string;
}

export function useStudySets() {
  const { user } = useAuth();
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStudySets = useCallback(async () => {
    if (!user) {
      setStudySets([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("study_sets")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setStudySets(data || []);
    } catch (e) {
      console.error("Error fetching study sets:", e);
    }
  }, [user]);

  const fetchMaterials = useCallback(async () => {
    if (!user) {
      setMaterials([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("uploaded_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (e) {
      console.error("Error fetching materials:", e);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchStudySets(), fetchMaterials()]);
    setIsLoading(false);
  }, [fetchStudySets, fetchMaterials]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createStudySet = async (name: string, description?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("study_sets")
        .insert({
          user_id: user.id,
          name,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;
      setStudySets((prev) => [data, ...prev]);
      return data;
    } catch (e) {
      console.error("Error creating study set:", e);
      return null;
    }
  };

  const updateStudySet = async (id: string, updates: { name?: string; description?: string }) => {
    try {
      const { data, error } = await supabase
        .from("study_sets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setStudySets((prev) => prev.map((s) => (s.id === id ? data : s)));
      return data;
    } catch (e) {
      console.error("Error updating study set:", e);
      return null;
    }
  };

  const deleteStudySet = async (id: string) => {
    try {
      // First, unlink all materials from this set
      await supabase
        .from("uploaded_materials")
        .update({ study_set_id: null })
        .eq("study_set_id", id);

      const { error } = await supabase.from("study_sets").delete().eq("id", id);
      if (error) throw error;

      setStudySets((prev) => prev.filter((s) => s.id !== id));
      setMaterials((prev) =>
        prev.map((m) => (m.study_set_id === id ? { ...m, study_set_id: null } : m))
      );
      return true;
    } catch (e) {
      console.error("Error deleting study set:", e);
      return false;
    }
  };

  const uploadMaterial = async (file: File, studySetId?: string) => {
    if (!user) return null;

    try {
      const fileId = crypto.randomUUID();
      const filePath = `${user.id}/${fileId}-${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("study-materials")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save to database
      const { data, error } = await supabase
        .from("uploaded_materials")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          study_set_id: studySetId || null,
        })
        .select()
        .single();

      if (error) throw error;
      setMaterials((prev) => [data, ...prev]);
      return data;
    } catch (e) {
      console.error("Error uploading material:", e);
      return null;
    }
  };

  const moveMaterial = async (materialId: string, studySetId: string | null) => {
    try {
      const { data, error } = await supabase
        .from("uploaded_materials")
        .update({ study_set_id: studySetId })
        .eq("id", materialId)
        .select()
        .single();

      if (error) throw error;
      setMaterials((prev) => prev.map((m) => (m.id === materialId ? data : m)));
      return true;
    } catch (e) {
      console.error("Error moving material:", e);
      return false;
    }
  };

  const deleteMaterial = async (id: string, filePath: string) => {
    try {
      await supabase.storage.from("study-materials").remove([filePath]);
      const { error } = await supabase.from("uploaded_materials").delete().eq("id", id);
      if (error) throw error;

      setMaterials((prev) => prev.filter((m) => m.id !== id));
      return true;
    } catch (e) {
      console.error("Error deleting material:", e);
      return false;
    }
  };

  const getMaterialsInSet = (studySetId: string | null) => {
    if (studySetId === null) {
      return materials.filter((m) => !m.study_set_id);
    }
    return materials.filter((m) => m.study_set_id === studySetId);
  };

  const getMaterialBase64 = async (material: Material): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("study-materials")
        .download(material.file_path);

      if (error) throw error;

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(data);
      });
    } catch (e) {
      console.error("Error getting material base64:", e);
      return null;
    }
  };

  const addLinkMaterial = async (url: string, name: string, studySetId?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("uploaded_materials")
        .insert({
          user_id: user.id,
          file_name: name,
          file_path: "", // No file path for links
          file_type: "link",
          file_size: null,
          source_url: url,
          study_set_id: studySetId || null,
        })
        .select()
        .single();

      if (error) throw error;
      setMaterials((prev) => [data, ...prev]);
      return data;
    } catch (e) {
      console.error("Error adding link material:", e);
      return null;
    }
  };

  return {
    studySets,
    materials,
    isLoading,
    refresh,
    createStudySet,
    updateStudySet,
    deleteStudySet,
    uploadMaterial,
    moveMaterial,
    deleteMaterial,
    getMaterialsInSet,
    getMaterialBase64,
    addLinkMaterial,
  };
}
