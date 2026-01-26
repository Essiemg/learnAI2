import { createContext, useContext, ReactNode } from 'react';
import { useEducation } from '@/hooks/useEducation';
import type { EducationLevel, Subject, UserEducation } from '@/types/education';

interface EducationContextType {
  userEducation: UserEducation | null;
  userSubjects: Subject[];
  allSubjects: Subject[];
  isLoading: boolean;
  needsOnboarding: boolean;
  getSubjectsByLevel: (level: EducationLevel) => Subject[];
  getSubjectsByCategory: (level: EducationLevel, category: string) => Subject[];
  saveEducation: (
    educationLevel: EducationLevel,
    fieldOfStudy: string | null,
    selectedSubjectIds: string[]
  ) => Promise<{ error: Error | null }>;
  refreshEducation: () => Promise<void>;
}

const EducationContext = createContext<EducationContextType | undefined>(undefined);

export function EducationProvider({ children }: { children: ReactNode }) {
  const education = useEducation();

  return (
    <EducationContext.Provider value={education}>
      {children}
    </EducationContext.Provider>
  );
}

export function useEducationContext() {
  const context = useContext(EducationContext);
  if (!context) {
    throw new Error('useEducationContext must be used within an EducationProvider');
  }
  return context;
}
