-- Create voice_sessions table for tracking live voice conversations
CREATE TABLE public.voice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own voice sessions" 
ON public.voice_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice sessions" 
ON public.voice_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice sessions" 
ON public.voice_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice sessions" 
ON public.voice_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_voice_sessions_updated_at
BEFORE UPDATE ON public.voice_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();