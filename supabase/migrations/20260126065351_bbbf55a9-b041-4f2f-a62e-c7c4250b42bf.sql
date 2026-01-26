-- Create parent_link_codes table for secure account linking
CREATE TABLE public.parent_link_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parent_link_codes ENABLE ROW LEVEL SECURITY;

-- Parents can view and create their own link codes
CREATE POLICY "Parents can view their own link codes"
ON public.parent_link_codes FOR SELECT
USING (auth.uid() = parent_user_id);

CREATE POLICY "Parents can create their own link codes"
ON public.parent_link_codes FOR INSERT
WITH CHECK (auth.uid() = parent_user_id AND has_role(auth.uid(), 'parent'));

CREATE POLICY "Parents can delete their own link codes"
ON public.parent_link_codes FOR DELETE
USING (auth.uid() = parent_user_id);

-- Anyone authenticated can read a code (to verify it exists for linking)
CREATE POLICY "Authenticated users can verify link codes"
ON public.parent_link_codes FOR SELECT
USING (auth.uid() IS NOT NULL AND used_at IS NULL AND expires_at > now());

-- Function to generate unique 6-digit code
CREATE OR REPLACE FUNCTION public.generate_parent_link_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 6-digit code
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if code already exists and is not expired/used
    SELECT EXISTS(
      SELECT 1 FROM public.parent_link_codes 
      WHERE code = new_code AND used_at IS NULL AND expires_at > now()
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to link child to parent using code
CREATE OR REPLACE FUNCTION public.link_child_to_parent(link_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_profile_id UUID;
  child_user_id UUID := auth.uid();
  child_education_level TEXT;
BEGIN
  -- Check if child is primary level
  SELECT education_level INTO child_education_level
  FROM public.user_education
  WHERE user_id = child_user_id;
  
  IF child_education_level IS NULL OR child_education_level != 'primary' THEN
    RAISE EXCEPTION 'Only primary school students can link to parents';
  END IF;
  
  -- Find valid link code and get parent profile id
  SELECT p.id INTO parent_profile_id
  FROM public.parent_link_codes plc
  JOIN public.profiles p ON p.user_id = plc.parent_user_id
  WHERE plc.code = link_code
    AND plc.used_at IS NULL
    AND plc.expires_at > now();
  
  IF parent_profile_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired link code';
  END IF;
  
  -- Update child profile with parent_id
  UPDATE public.profiles
  SET parent_id = parent_profile_id
  WHERE user_id = child_user_id;
  
  -- Mark code as used
  UPDATE public.parent_link_codes
  SET used_at = now()
  WHERE code = link_code;
  
  RETURN TRUE;
END;
$$;