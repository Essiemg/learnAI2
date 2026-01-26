import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EducationLevelStep } from './EducationLevelStep';
import { FieldOfStudyStep } from './FieldOfStudyStep';
import { SubjectSelectionStep } from './SubjectSelectionStep';
import { OnboardingComplete } from './OnboardingComplete';
import { useEducationContext } from '@/contexts/EducationContext';
import { useAuth } from '@/contexts/AuthContext';
import type { EducationLevel } from '@/types/education';
import { toast } from 'sonner';

type Step = 'education-level' | 'field-of-study' | 'subjects' | 'complete';

export function OnboardingFlow() {
  const { profile } = useAuth();
  const { saveEducation, allSubjects } = useEducationContext();
  
  const [step, setStep] = useState<Step>('education-level');
  const [educationLevel, setEducationLevel] = useState<EducationLevel | null>(null);
  const [fieldOfStudy, setFieldOfStudy] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleEducationLevelSelect = (level: EducationLevel) => {
    setEducationLevel(level);
    setFieldOfStudy(null);
    setSelectedSubjects([]);
    
    if (level === 'primary') {
      // Primary doesn't have fields of study, go straight to subjects
      setStep('subjects');
    } else {
      setStep('field-of-study');
    }
  };

  const handleFieldOfStudySelect = (field: string) => {
    setFieldOfStudy(field);
    setStep('subjects');
  };

  const handleSubjectsSelected = async (subjectIds: string[]) => {
    setSelectedSubjects(subjectIds);
    setIsSaving(true);

    const { error } = await saveEducation(
      educationLevel!,
      fieldOfStudy,
      subjectIds
    );

    setIsSaving(false);

    if (error) {
      toast.error('Failed to save your preferences. Please try again.');
      return;
    }

    setStep('complete');
  };

  const handleBack = () => {
    if (step === 'field-of-study') {
      setStep('education-level');
    } else if (step === 'subjects') {
      if (educationLevel === 'primary') {
        setStep('education-level');
      } else {
        setStep('field-of-study');
      }
    }
  };

  const filteredSubjects = educationLevel 
    ? allSubjects.filter(s => s.education_level === educationLevel)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {step === 'education-level' && (
            <motion.div
              key="education-level"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <EducationLevelStep
                userName={profile?.display_name || 'there'}
                onSelect={handleEducationLevelSelect}
              />
            </motion.div>
          )}

          {step === 'field-of-study' && educationLevel && (
            <motion.div
              key="field-of-study"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <FieldOfStudyStep
                educationLevel={educationLevel}
                onSelect={handleFieldOfStudySelect}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {step === 'subjects' && educationLevel && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SubjectSelectionStep
                educationLevel={educationLevel}
                subjects={filteredSubjects}
                selectedSubjects={selectedSubjects}
                onSubmit={handleSubjectsSelected}
                onBack={handleBack}
                isSaving={isSaving}
              />
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <OnboardingComplete educationLevel={educationLevel!} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
