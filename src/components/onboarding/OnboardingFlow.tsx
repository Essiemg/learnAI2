import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EducationLevelStep } from './EducationLevelStep';
import { GradeSelectionStep } from './GradeSelectionStep';
import { CollegeDetailsStep } from './CollegeDetailsStep';
import { OnboardingComplete } from './OnboardingComplete';
import { useEducationContext } from '@/contexts/EducationContext';
import { useAuth } from '@/contexts/AuthContext';
import type { EducationLevel } from '@/types/education';
import { toast } from 'sonner';

type Step = 'education-level' | 'grade-selection' | 'college-details' | 'complete';

export function OnboardingFlow() {
  const { profile } = useAuth();
  const { saveEducation } = useEducationContext();
  
  const [step, setStep] = useState<Step>('education-level');
  const [educationLevel, setEducationLevel] = useState<EducationLevel | null>(null);
  const [gradeLevel, setGradeLevel] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEducationLevelSelect = (level: EducationLevel) => {
    setEducationLevel(level);
    setGradeLevel(null);
    
    if (level === 'college') {
      // College needs year and major selection
      setStep('college-details');
    } else {
      // Primary and High School need grade selection
      setStep('grade-selection');
    }
  };

  const handleGradeSelect = async (grade: number) => {
    setGradeLevel(grade);
    setIsSaving(true);
    
    const { error } = await saveEducation(educationLevel!, null, [], grade, null, null);
    setIsSaving(false);
    
    if (error) {
      toast.error('Failed to save your preferences. Please try again.');
      return;
    }
    
    setStep('complete');
  };

  const handleCollegeDetailsSubmit = async (year: number, major: string) => {
    setIsSaving(true);
    
    const { error } = await saveEducation(educationLevel!, null, [], null, year, major);
    setIsSaving(false);
    
    if (error) {
      toast.error('Failed to save your preferences. Please try again.');
      return;
    }
    
    setStep('complete');
  };

  const handleBack = () => {
    if (step === 'grade-selection' || step === 'college-details') {
      setStep('education-level');
    }
  };

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

          {step === 'grade-selection' && educationLevel && (
            <motion.div
              key="grade-selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <GradeSelectionStep
                educationLevel={educationLevel}
                onSelect={handleGradeSelect}
                onBack={handleBack}
                isSaving={isSaving}
              />
            </motion.div>
          )}

          {step === 'college-details' && (
            <motion.div
              key="college-details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CollegeDetailsStep
                onSubmit={handleCollegeDetailsSubmit}
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
