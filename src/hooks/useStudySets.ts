import { useState, useEffect, useCallback } from "react";
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
  base64_data?: string;
}

const STUDY_SETS_KEY = "learnai_study_sets";
const MATERIALS_KEY = "learnai_materials";

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
      const stored = localStorage.getItem(`${STUDY_SETS_KEY}_${user.id}`);
      const data = stored ? JSON.parse(stored) : [];
      setStudySets(data);
    } catch (e) {
      console.error("Error fetching study sets:", e);
      setStudySets([]);
    }
  }, [user]);

  const fetchMaterials = useCallback(async () => {
    if (!user) {
      setMaterials([]);
      return;
    }

    try {
      const stored = localStorage.getItem(`${MATERIALS_KEY}_${user.id}`);
      const data = stored ? JSON.parse(stored) : [];
      setMaterials(data);
    } catch (e) {
      console.error("Error fetching materials:", e);
      setMaterials([]);
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

  const saveStudySetsLocal = useCallback(
    (newSets: StudySet[]) => {
      if (!user) return;
      localStorage.setItem(`${STUDY_SETS_KEY}_${user.id}`, JSON.stringify(newSets));
      setStudySets(newSets);
    },
    [user]
  );

  const saveMaterialsLocal = useCallback(
    (newMaterials: Material[]) => {
      if (!user) return;
      localStorage.setItem(`${MATERIALS_KEY}_${user.id}`, JSON.stringify(newMaterials));
      setMaterials(newMaterials);
    },
    [user]
  );

  const createStudySet = async (name: string, description?: string) => {
    if (!user) return null;

    try {
      const now = new Date().toISOString();
      const newSet: StudySet = {
        id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description: description || null,
        created_at: now,
        updated_at: now,
      };
      saveStudySetsLocal([newSet, ...studySets]);
      return newSet;
    } catch (e) {
      console.error("Error creating study set:", e);
      return null;
    }
  };

  const updateStudySet = async (id: string, updates: { name?: string; description?: string }) => {
    try {
      const updatedSets = studySets.map((s) =>
        s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s
      );
      saveStudySetsLocal(updatedSets);
      return updatedSets.find((s) => s.id === id) || null;
    } catch (e) {
      console.error("Error updating study set:", e);
      return null;
    }
  };

  const deleteStudySet = async (id: string) => {
    try {
      // Unlink materials from this set
      const updatedMaterials = materials.map((m) =>
        m.study_set_id === id ? { ...m, study_set_id: null } : m
      );
      saveMaterialsLocal(updatedMaterials);

      // Delete the set
      const newSets = studySets.filter((s) => s.id !== id);
      saveStudySetsLocal(newSets);
      return true;
    } catch (e) {
      console.error("Error deleting study set:", e);
      return false;
    }
  };

  const uploadMaterial = async (file: File, studySetId?: string) => {
    if (!user) return null;

    try {
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const filePath = `${user.id}/${fileId}-${file.name}`;

      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const newMaterial: Material = {
        id: fileId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        extracted_text: null,
        study_set_id: studySetId || null,
        source_url: null,
        created_at: new Date().toISOString(),
        base64_data: base64Data,
      };

      saveMaterialsLocal([newMaterial, ...materials]);
      return newMaterial;
    } catch (e) {
      console.error("Error uploading material:", e);
      return null;
    }
  };

  const moveMaterial = async (materialId: string, studySetId: string | null) => {
    try {
      const updatedMaterials = materials.map((m) =>
        m.id === materialId ? { ...m, study_set_id: studySetId } : m
      );
      saveMaterialsLocal(updatedMaterials);
      return true;
    } catch (e) {
      console.error("Error moving material:", e);
      return false;
    }
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

  const getMaterialsInSet = (studySetId: string | null) => {
    if (studySetId === null) {
      return materials.filter((m) => !m.study_set_id);
    }
    return materials.filter((m) => m.study_set_id === studySetId);
  };

  const getMaterialBase64 = async (material: Material): Promise<string | null> => {
    return material.base64_data || null;
  };

  const addLinkMaterial = async (url: string, name: string, studySetId?: string) => {
    if (!user) return null;

    try {
      const newMaterial: Material = {
        id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file_name: name,
        file_path: "",
        file_type: "link",
        file_size: null,
        extracted_text: null,
        source_url: url,
        study_set_id: studySetId || null,
        created_at: new Date().toISOString(),
      };

      saveMaterialsLocal([newMaterial, ...materials]);
      return newMaterial;
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
