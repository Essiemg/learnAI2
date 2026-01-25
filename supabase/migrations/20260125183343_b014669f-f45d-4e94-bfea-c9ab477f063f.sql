-- Create summaries table
CREATE TABLE public.summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  source_text TEXT,
  summary TEXT NOT NULL,
  material_id UUID REFERENCES public.uploaded_materials(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own summaries" 
ON public.summaries FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own summaries" 
ON public.summaries FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries" 
ON public.summaries FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own summaries" 
ON public.summaries FOR DELETE 
USING (auth.uid() = user_id);

-- Parents can view children summaries
CREATE POLICY "Parents can view children summaries" 
ON public.summaries FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN profiles parent_profile ON parent_profile.user_id = auth.uid()
    WHERE p.user_id = summaries.user_id AND p.parent_id = parent_profile.id
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_summaries_updated_at
BEFORE UPDATE ON public.summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create diagrams table
CREATE TABLE public.diagrams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  source_text TEXT,
  diagram_type TEXT NOT NULL DEFAULT 'flowchart',
  mermaid_code TEXT NOT NULL,
  material_id UUID REFERENCES public.uploaded_materials(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own diagrams" 
ON public.diagrams FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own diagrams" 
ON public.diagrams FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diagrams" 
ON public.diagrams FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diagrams" 
ON public.diagrams FOR DELETE 
USING (auth.uid() = user_id);

-- Parents can view children diagrams
CREATE POLICY "Parents can view children diagrams" 
ON public.diagrams FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN profiles parent_profile ON parent_profile.user_id = auth.uid()
    WHERE p.user_id = diagrams.user_id AND p.parent_id = parent_profile.id
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_diagrams_updated_at
BEFORE UPDATE ON public.diagrams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();