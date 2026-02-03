export type EducationLevel = 'primary' | 'high_school' | 'college';

export interface Subject {
  id: string;
  name: string;
  education_level: EducationLevel;
  category: string | null;
  description?: string | null;
  icon?: string | null;
  created_at: string;
}

export interface UserEducation {
  id: string;
  user_id: string;
  education_level: EducationLevel;
  grade_level?: number | null; // Grade 1-8 for primary, 9-12 for high school
  college_year?: number | null; // Year 1-6 for college
  major?: string | null; // Major/course for college
  field_of_study: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  // Track education history when user changes level
  education_history?: EducationHistoryEntry[];
}

export interface EducationHistoryEntry {
  education_level: EducationLevel;
  grade_level?: number | null;
  college_year?: number | null;
  major?: string | null;
  field_of_study: string | null;
  changed_at: string;
}

export interface UserSubject {
  id: string;
  user_id: string;
  subject_id: string;
  created_at: string;
}

// Grade options for Primary School (Grades 1-8)
export const PRIMARY_GRADES = [
  { value: 1, label: 'Grade 1', description: 'Ages 6-7' },
  { value: 2, label: 'Grade 2', description: 'Ages 7-8' },
  { value: 3, label: 'Grade 3', description: 'Ages 8-9' },
  { value: 4, label: 'Grade 4', description: 'Ages 9-10' },
  { value: 5, label: 'Grade 5', description: 'Ages 10-11' },
  { value: 6, label: 'Grade 6', description: 'Ages 11-12' },
  { value: 7, label: 'Grade 7', description: 'Ages 12-13' },
  { value: 8, label: 'Grade 8', description: 'Ages 13-14' },
];

// Grade options for High School (Grades 9-12)
export const HIGH_SCHOOL_GRADES = [
  { value: 9, label: 'Grade 9', description: 'Freshman - Ages 14-15' },
  { value: 10, label: 'Grade 10', description: 'Sophomore - Ages 15-16' },
  { value: 11, label: 'Grade 11', description: 'Junior - Ages 16-17' },
  { value: 12, label: 'Grade 12', description: 'Senior - Ages 17-18' },
];

// Year options for College
export const COLLEGE_YEARS = [
  { value: 1, label: 'Year 1', description: 'Freshman' },
  { value: 2, label: 'Year 2', description: 'Sophomore' },
  { value: 3, label: 'Year 3', description: 'Junior' },
  { value: 4, label: 'Year 4', description: 'Senior' },
  { value: 5, label: 'Year 5', description: 'Extended / Professional' },
  { value: 6, label: 'Year 6+', description: 'Graduate / Extended' },
];

// Common college majors
export const COLLEGE_MAJORS = [
  'Computer Science',
  'Information Technology',
  'Software Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Business Administration',
  'Accounting',
  'Finance',
  'Marketing',
  'Economics',
  'Medicine',
  'Nursing',
  'Pharmacy',
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
  'Psychology',
  'Sociology',
  'Political Science',
  'Law',
  'Education',
  'English Literature',
  'Communications',
  'Journalism',
  'Art & Design',
  'Music',
  'Architecture',
  'Agriculture',
  'Environmental Science',
  'Other',
];

export const EDUCATION_LEVELS: { value: EducationLevel; label: string; description: string }[] = [
  { 
    value: 'primary', 
    label: 'Primary School', 
    description: 'Grades 1-8 (Ages 6-14)' 
  },
  { 
    value: 'high_school', 
    label: 'High School', 
    description: 'Grades 9-12 (Ages 14-18)' 
  },
  { 
    value: 'college', 
    label: 'College / University', 
    description: 'Undergraduate & beyond' 
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
  college: [
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
