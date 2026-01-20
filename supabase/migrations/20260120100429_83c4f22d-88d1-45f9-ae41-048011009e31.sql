-- Create chat_sessions table for tutor chat history
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flashcard_sessions table
CREATE TABLE public.flashcard_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_sessions table
CREATE TABLE public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create essay_submissions table
CREATE TABLE public.essay_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT,
  title TEXT,
  content TEXT NOT NULL,
  feedback JSONB,
  overall_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_submissions ENABLE ROW LEVEL SECURITY;

-- Chat sessions policies
CREATE POLICY "Users can view their own chat sessions"
ON public.chat_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions"
ON public.chat_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
ON public.chat_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
ON public.chat_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Flashcard sessions policies
CREATE POLICY "Users can view their own flashcard sessions"
ON public.flashcard_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcard sessions"
ON public.flashcard_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard sessions"
ON public.flashcard_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard sessions"
ON public.flashcard_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Quiz sessions policies
CREATE POLICY "Users can view their own quiz sessions"
ON public.quiz_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz sessions"
ON public.quiz_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz sessions"
ON public.quiz_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quiz sessions"
ON public.quiz_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Essay submissions policies
CREATE POLICY "Users can view their own essay submissions"
ON public.essay_submissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own essay submissions"
ON public.essay_submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own essay submissions"
ON public.essay_submissions FOR DELETE
USING (auth.uid() = user_id);

-- Parents can view their children's data policies
CREATE POLICY "Parents can view children chat sessions"
ON public.chat_sessions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  JOIN public.profiles parent_profile ON parent_profile.user_id = auth.uid()
  WHERE p.user_id = chat_sessions.user_id AND p.parent_id = parent_profile.id
));

CREATE POLICY "Parents can view children flashcard sessions"
ON public.flashcard_sessions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  JOIN public.profiles parent_profile ON parent_profile.user_id = auth.uid()
  WHERE p.user_id = flashcard_sessions.user_id AND p.parent_id = parent_profile.id
));

CREATE POLICY "Parents can view children quiz sessions"
ON public.quiz_sessions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  JOIN public.profiles parent_profile ON parent_profile.user_id = auth.uid()
  WHERE p.user_id = quiz_sessions.user_id AND p.parent_id = parent_profile.id
));

CREATE POLICY "Parents can view children essay submissions"
ON public.essay_submissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  JOIN public.profiles parent_profile ON parent_profile.user_id = auth.uid()
  WHERE p.user_id = essay_submissions.user_id AND p.parent_id = parent_profile.id
));

-- Create updated_at triggers
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flashcard_sessions_updated_at
BEFORE UPDATE ON public.flashcard_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quiz_sessions_updated_at
BEFORE UPDATE ON public.quiz_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_flashcard_sessions_user_id ON public.flashcard_sessions(user_id);
CREATE INDEX idx_quiz_sessions_user_id ON public.quiz_sessions(user_id);
CREATE INDEX idx_essay_submissions_user_id ON public.essay_submissions(user_id);