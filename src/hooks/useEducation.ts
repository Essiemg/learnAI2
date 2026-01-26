import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EducationLevel, Subject, UserEducation } from '@/types/education';

export function useEducation() {
  const { user } = useAuth();
  const [userEducation, setUserEducation] = useState<UserEducation | null>(null);
  const [userSubjects, setUserSubjects] = useState<Subject[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEducation = useCallback(async () => {
    if (!user) {
      setUserEducation(null);
      setUserSubjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch user education
      const { data: eduData } = await supabase
        .from('user_education')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserEducation(eduData as UserEducation | null);

      // Fetch user's selected subjects
      if (eduData) {
        const { data: userSubjectData } = await supabase
          .from('user_subjects')
          .select('subject_id')
          .eq('user_id', user.id);

        if (userSubjectData && userSubjectData.length > 0) {
          const subjectIds = userSubjectData.map(us => us.subject_id);
          const { data: subjects } = await supabase
            .from('subjects')
            .select('*')
            .in('id', subjectIds);

          setUserSubjects((subjects as Subject[]) || []);
        }
      }
    } catch (error) {
      console.error('Error fetching education:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchAllSubjects = useCallback(async () => {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .order('name');
    
    setAllSubjects((data as Subject[]) || []);
  }, []);

  const getSubjectsByLevel = useCallback((level: EducationLevel) => {
    return allSubjects.filter(s => s.education_level === level);
  }, [allSubjects]);

  const getSubjectsByCategory = useCallback((level: EducationLevel, category: string) => {
    return allSubjects.filter(s => s.education_level === level && s.category === category);
  }, [allSubjects]);

  const saveEducation = async (
    educationLevel: EducationLevel,
    fieldOfStudy: string | null,
    selectedSubjectIds: string[]
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // Upsert user education
      const { error: eduError } = await supabase
        .from('user_education')
        .upsert({
          user_id: user.id,
          education_level: educationLevel,
          field_of_study: fieldOfStudy,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (eduError) throw eduError;

      // Delete existing subjects and insert new ones
      await supabase
        .from('user_subjects')
        .delete()
        .eq('user_id', user.id);

      if (selectedSubjectIds.length > 0) {
        const { error: subError } = await supabase
          .from('user_subjects')
          .insert(
            selectedSubjectIds.map(subjectId => ({
              user_id: user.id,
              subject_id: subjectId,
            }))
          );

        if (subError) throw subError;
      }

      await fetchEducation();
      return { error: null };
    } catch (error) {
      console.error('Error saving education:', error);
      return { error: error as Error };
    }
  };

  useEffect(() => {
    fetchEducation();
    fetchAllSubjects();
  }, [fetchEducation, fetchAllSubjects]);

  return {
    userEducation,
    userSubjects,
    allSubjects,
    isLoading,
    needsOnboarding: !isLoading && user && !userEducation?.onboarding_completed,
    getSubjectsByLevel,
    getSubjectsByCategory,
    saveEducation,
    refreshEducation: fetchEducation,
  };
}
