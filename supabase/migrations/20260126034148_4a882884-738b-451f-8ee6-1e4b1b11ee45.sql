-- Create education level enum
CREATE TYPE public.education_level AS ENUM ('primary', 'high_school', 'undergraduate');

-- Create subjects reference table (scalable for future additions)
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  education_level public.education_level NOT NULL,
  category text, -- 'sciences', 'arts', 'business', 'stem', etc.
  description text,
  icon text, -- lucide icon name
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create user education preferences table
CREATE TABLE public.user_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  education_level public.education_level NOT NULL,
  field_of_study text, -- degree program for undergrad, subject combo for high school
  onboarding_completed boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create user selected subjects junction table
CREATE TABLE public.user_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, subject_id)
);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

-- Subjects are public readable
CREATE POLICY "Subjects are publicly readable" ON public.subjects FOR SELECT USING (true);

-- User education policies
CREATE POLICY "Users can view their own education" ON public.user_education FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own education" ON public.user_education FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own education" ON public.user_education FOR UPDATE USING (auth.uid() = user_id);

-- User subjects policies
CREATE POLICY "Users can view their own subjects" ON public.user_subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subjects" ON public.user_subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subjects" ON public.user_subjects FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_education_updated_at
  BEFORE UPDATE ON public.user_education
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default subjects for each education level
-- Primary subjects
INSERT INTO public.subjects (name, education_level, category, icon) VALUES
  ('Mathematics', 'primary', 'core', 'Calculator'),
  ('English', 'primary', 'core', 'BookOpen'),
  ('Science', 'primary', 'core', 'FlaskConical'),
  ('Social Studies', 'primary', 'core', 'Globe'),
  ('Art', 'primary', 'creative', 'Palette'),
  ('Music', 'primary', 'creative', 'Music'),
  ('Physical Education', 'primary', 'activity', 'Dumbbell');

-- High School subjects
INSERT INTO public.subjects (name, education_level, category, icon) VALUES
  ('Mathematics', 'high_school', 'sciences', 'Calculator'),
  ('Physics', 'high_school', 'sciences', 'Atom'),
  ('Chemistry', 'high_school', 'sciences', 'FlaskConical'),
  ('Biology', 'high_school', 'sciences', 'Dna'),
  ('English Literature', 'high_school', 'arts', 'BookOpen'),
  ('History', 'high_school', 'arts', 'Clock'),
  ('Geography', 'high_school', 'arts', 'Globe'),
  ('Economics', 'high_school', 'business', 'TrendingUp'),
  ('Accounting', 'high_school', 'business', 'Receipt'),
  ('Business Studies', 'high_school', 'business', 'Briefcase'),
  ('Computer Science', 'high_school', 'sciences', 'Code');

-- Undergraduate subjects/courses
INSERT INTO public.subjects (name, education_level, category, icon) VALUES
  ('Computer Science', 'undergraduate', 'stem', 'Code'),
  ('Software Engineering', 'undergraduate', 'stem', 'Laptop'),
  ('Data Science', 'undergraduate', 'stem', 'BarChart'),
  ('Mechanical Engineering', 'undergraduate', 'engineering', 'Cog'),
  ('Electrical Engineering', 'undergraduate', 'engineering', 'Zap'),
  ('Civil Engineering', 'undergraduate', 'engineering', 'Building'),
  ('Business Administration', 'undergraduate', 'business', 'Briefcase'),
  ('Finance', 'undergraduate', 'business', 'DollarSign'),
  ('Marketing', 'undergraduate', 'business', 'Megaphone'),
  ('Education', 'undergraduate', 'humanities', 'GraduationCap'),
  ('Psychology', 'undergraduate', 'humanities', 'Brain'),
  ('Law', 'undergraduate', 'humanities', 'Scale'),
  ('Medicine', 'undergraduate', 'health', 'Stethoscope'),
  ('Nursing', 'undergraduate', 'health', 'Heart'),
  ('Pharmacy', 'undergraduate', 'health', 'Pill');