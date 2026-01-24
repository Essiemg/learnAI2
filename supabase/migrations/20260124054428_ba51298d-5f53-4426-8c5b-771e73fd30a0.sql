-- Create storage bucket for uploaded study materials
INSERT INTO storage.buckets (id, name, public) 
VALUES ('study-materials', 'study-materials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for study materials
CREATE POLICY "Users can upload their own study materials"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own study materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own study materials"
ON storage.objects FOR DELETE
USING (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own study materials"
ON storage.objects FOR UPDATE
USING (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table for uploaded materials (for tracking and reusing)
CREATE TABLE public.uploaded_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  extracted_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uploaded_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies for uploaded materials
CREATE POLICY "Users can create their own materials"
ON public.uploaded_materials FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own materials"
ON public.uploaded_materials FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own materials"
ON public.uploaded_materials FOR DELETE
USING (auth.uid() = user_id);