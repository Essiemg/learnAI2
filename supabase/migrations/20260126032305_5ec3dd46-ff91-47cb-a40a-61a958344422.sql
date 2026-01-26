-- Add source_url column to uploaded_materials for link-based materials
ALTER TABLE public.uploaded_materials 
ADD COLUMN source_url text;

-- Add RLS policy for updating materials (needed for extracted text updates)
CREATE POLICY "Users can update their own materials"
ON public.uploaded_materials
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster URL lookups
CREATE INDEX idx_uploaded_materials_source_url ON public.uploaded_materials(source_url) WHERE source_url IS NOT NULL;