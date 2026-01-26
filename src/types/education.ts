export type EducationLevel = 'primary' | 'high_school' | 'undergraduate';

export interface Subject {
  id: string;
  name: string;
  education_level: EducationLevel;
  category: string | null;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface UserEducation {
  id: string;
  user_id: string;
  education_level: EducationLevel;
  field_of_study: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubject {
  id: string;
  user_id: string;
  subject_id: string;
  created_at: string;
}

export const EDUCATION_LEVELS: { value: EducationLevel; label: string; description: string }[] = [
  { 
    value: 'primary', 
    label: 'Primary School', 
    description: 'Elementary education (Ages 5-12)' 
  },
  { 
    value: 'high_school', 
    label: 'High School', 
    description: 'Secondary education (Ages 13-18)' 
  },
  { 
    value: 'undergraduate', 
    label: 'Undergraduate', 
    description: 'University/College level' 
  },
];

export const FIELD_OF_STUDY_OPTIONS: Record<EducationLevel, string[]> = {
  primary: [], // Primary doesn't have fields of study
  high_school: [
    'Sciences',
    'Arts & Humanities',
    'Business Studies',
    'Technical/Vocational',
    'General Studies',
  ],
  undergraduate: [
    'Computer Science & IT',
    'Engineering',
    'Business & Management',
    'Health Sciences',
    'Education',
    'Law',
    'Arts & Humanities',
    'Natural Sciences',
    'Social Sciences',
  ],
};
