-- Create study_sets table for organizing materials into folders
CREATE TABLE public.study_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add study_set_id to uploaded_materials to link files to folders
ALTER TABLE public.uploaded_materials 
ADD COLUMN study_set_id UUID REFERENCES public.study_sets(id) ON DELETE SET NULL;

-- Enable RLS on study_sets
ALTER TABLE public.study_sets ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_sets
CREATE POLICY "Users can view their own study sets"
ON public.study_sets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study sets"
ON public.study_sets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sets"
ON public.study_sets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sets"
ON public.study_sets FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on study_sets
CREATE TRIGGER update_study_sets_updated_at
BEFORE UPDATE ON public.study_sets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();