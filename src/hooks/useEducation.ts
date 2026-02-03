import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { EducationLevel, Subject, UserEducation, EducationHistoryEntry } from '@/types/education';

const EDUCATION_STORAGE_KEY = 'learnai_user_education';
const SUBJECTS_STORAGE_KEY = 'learnai_user_subjects';

// Default subjects organized by education level
const DEFAULT_SUBJECTS: Subject[] = [
  // Primary School
  { id: 'p1', name: 'Mathematics', education_level: 'primary', category: 'Core', created_at: new Date().toISOString() },
  { id: 'p2', name: 'English', education_level: 'primary', category: 'Core', created_at: new Date().toISOString() },
  { id: 'p3', name: 'Science', education_level: 'primary', category: 'Core', created_at: new Date().toISOString() },
  { id: 'p4', name: 'Social Studies', education_level: 'primary', category: 'Core', created_at: new Date().toISOString() },
  { id: 'p5', name: 'Reading', education_level: 'primary', category: 'Core', created_at: new Date().toISOString() },
  
  // High School
  { id: '1', name: 'Mathematics', education_level: 'high_school', category: 'STEM', created_at: new Date().toISOString() },
  { id: '2', name: 'Physics', education_level: 'high_school', category: 'STEM', created_at: new Date().toISOString() },
  { id: '3', name: 'Chemistry', education_level: 'high_school', category: 'STEM', created_at: new Date().toISOString() },
  { id: '4', name: 'Biology', education_level: 'high_school', category: 'STEM', created_at: new Date().toISOString() },
  { id: '5', name: 'English', education_level: 'high_school', category: 'Languages', created_at: new Date().toISOString() },
  { id: '6', name: 'History', education_level: 'high_school', category: 'Humanities', created_at: new Date().toISOString() },
  { id: '7', name: 'Geography', education_level: 'high_school', category: 'Humanities', created_at: new Date().toISOString() },
  { id: '8', name: 'Computer Science', education_level: 'high_school', category: 'STEM', created_at: new Date().toISOString() },
  
  // College
  { id: '10', name: 'Calculus', education_level: 'college', category: 'STEM', created_at: new Date().toISOString() },
  { id: '11', name: 'Linear Algebra', education_level: 'college', category: 'STEM', created_at: new Date().toISOString() },
  { id: '12', name: 'Data Structures', education_level: 'college', category: 'STEM', created_at: new Date().toISOString() },
  { id: '13', name: 'Algorithms', education_level: 'college', category: 'STEM', created_at: new Date().toISOString() },
  { id: '14', name: 'Machine Learning', education_level: 'college', category: 'STEM', created_at: new Date().toISOString() },
  { id: '15', name: 'Economics', education_level: 'college', category: 'Business', created_at: new Date().toISOString() },
  { id: '16', name: 'Psychology', education_level: 'college', category: 'Social Sciences', created_at: new Date().toISOString() },
  { id: '17', name: 'Statistics', education_level: 'college', category: 'STEM', created_at: new Date().toISOString() },
];

export function useEducation() {
  const { user } = useAuth();
  const [userEducation, setUserEducation] = useState<UserEducation | null>(null);
  const [userSubjects, setUserSubjects] = useState<Subject[]>([]);
  const [allSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
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
      // Fetch user education from localStorage
      const storedEducation = localStorage.getItem(`${EDUCATION_STORAGE_KEY}_${user.id}`);
      const eduData = storedEducation ? JSON.parse(storedEducation) : null;
      setUserEducation(eduData as UserEducation | null);

      // Fetch user's selected subjects from localStorage
      if (eduData) {
        const storedSubjects = localStorage.getItem(`${SUBJECTS_STORAGE_KEY}_${user.id}`);
        const subjectIds: string[] = storedSubjects ? JSON.parse(storedSubjects) : [];

        if (subjectIds.length > 0) {
          const subjects = DEFAULT_SUBJECTS.filter(s => subjectIds.includes(s.id));
          setUserSubjects(subjects);
        } else {
          setUserSubjects([]);
        }
      }
    } catch (error) {
      console.error('Error fetching education:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getSubjectsByLevel = useCallback((level: EducationLevel) => {
    return allSubjects.filter(s => s.education_level === level);
  }, [allSubjects]);

  const getSubjectsByCategory = useCallback((level: EducationLevel, category: string) => {
    return allSubjects.filter(s => s.education_level === level && s.category === category);
  }, [allSubjects]);

  const saveEducation = async (
    educationLevel: EducationLevel,
    fieldOfStudy: string | null,
    selectedSubjectIds: string[],
    gradeLevel?: number | null,
    collegeYear?: number | null,
    major?: string | null
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // Get existing education data to preserve history
      const existingData = localStorage.getItem(`${EDUCATION_STORAGE_KEY}_${user.id}`);
      const existingEducation: UserEducation | null = existingData ? JSON.parse(existingData) : null;
      
      // Build education history if level is changing
      let educationHistory: EducationHistoryEntry[] = existingEducation?.education_history || [];
      
      if (existingEducation && existingEducation.education_level !== educationLevel) {
        // Save the previous education to history
        const historyEntry: EducationHistoryEntry = {
          education_level: existingEducation.education_level,
          grade_level: existingEducation.grade_level,
          college_year: existingEducation.college_year,
          major: existingEducation.major,
          field_of_study: existingEducation.field_of_study,
          changed_at: new Date().toISOString(),
        };
        educationHistory = [...educationHistory, historyEntry];
      }

      // Save user education to localStorage
      const educationData: UserEducation = {
        id: existingEducation?.id || `edu_${user.id}`,
        user_id: user.id,
        education_level: educationLevel,
        grade_level: gradeLevel || null,
        college_year: collegeYear || null,
        major: major || null,
        field_of_study: fieldOfStudy,
        onboarding_completed: true,
        created_at: existingEducation?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        education_history: educationHistory,
      };
      
      localStorage.setItem(`${EDUCATION_STORAGE_KEY}_${user.id}`, JSON.stringify(educationData));

      // Save selected subject IDs to localStorage
      localStorage.setItem(`${SUBJECTS_STORAGE_KEY}_${user.id}`, JSON.stringify(selectedSubjectIds));

      await fetchEducation();
      return { error: null };
    } catch (error) {
      console.error('Error saving education:', error);
      return { error: error as Error };
    }
  };

  // Update specific education fields without resetting everything
  const updateEducationDetails = async (updates: Partial<Pick<UserEducation, 'grade_level' | 'college_year' | 'major' | 'field_of_study'>>) => {
    if (!user || !userEducation) return { error: new Error('Not authenticated or no education data') };

    try {
      const updatedData: UserEducation = {
        ...userEducation,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      localStorage.setItem(`${EDUCATION_STORAGE_KEY}_${user.id}`, JSON.stringify(updatedData));
      await fetchEducation();
      return { error: null };
    } catch (error) {
      console.error('Error updating education:', error);
      return { error: error as Error };
    }
  };

  useEffect(() => {
    fetchEducation();
  }, [fetchEducation]);

  return {
    userEducation,
    userSubjects,
    allSubjects,
    isLoading,
    needsOnboarding: !isLoading && user && !userEducation?.onboarding_completed,
    getSubjectsByLevel,
    getSubjectsByCategory,
    saveEducation,
    updateEducationDetails,
    refreshEducation: fetchEducation,
  };
}
