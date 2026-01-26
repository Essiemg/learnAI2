-- Create enum for learning style preferences
CREATE TYPE public.learning_style AS ENUM ('step_by_step', 'conceptual', 'practice_oriented', 'visual', 'mixed');

-- Create enum for confidence levels
CREATE TYPE public.confidence_level AS ENUM ('confused', 'uncertain', 'neutral', 'confident', 'mastered');

-- Table to track individual learning interactions
CREATE TABLE public.learning_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID, -- Optional link to chat_sessions
  topic TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id),
  interaction_type TEXT NOT NULL DEFAULT 'question', -- question, follow_up, clarification, practice
  explanation_count INTEGER NOT NULL DEFAULT 1, -- How many explanations were needed
  follow_up_count INTEGER NOT NULL DEFAULT 0, -- Number of follow-up questions
  confidence_indicator confidence_level DEFAULT 'neutral',
  response_helpful BOOLEAN, -- User feedback on response
  time_spent_seconds INTEGER, -- Time spent on this interaction
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store inferred learner preferences (updated periodically)
CREATE TABLE public.learner_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferred_style learning_style DEFAULT 'mixed',
  average_explanation_depth INTEGER DEFAULT 2, -- 1=simple, 2=moderate, 3=detailed
  prefers_examples BOOLEAN DEFAULT true,
  prefers_analogies BOOLEAN DEFAULT true,
  prefers_step_by_step BOOLEAN DEFAULT true,
  prefers_practice_problems BOOLEAN DEFAULT false,
  average_confidence confidence_level DEFAULT 'neutral',
  total_interactions INTEGER DEFAULT 0,
  total_topics_covered INTEGER DEFAULT 0,
  struggling_topics TEXT[], -- Topics that needed multiple explanations
  strong_topics TEXT[], -- Topics with high confidence
  last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to track topic mastery over time
CREATE TABLE public.topic_mastery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id),
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  times_studied INTEGER DEFAULT 1,
  times_struggled INTEGER DEFAULT 0,
  last_confidence confidence_level DEFAULT 'neutral',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic)
);

-- Enable RLS
ALTER TABLE public.learning_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_interactions
CREATE POLICY "Users can view their own interactions"
  ON public.learning_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions"
  ON public.learning_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions"
  ON public.learning_interactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions"
  ON public.learning_interactions FOR DELETE
  USING (auth.uid() = user_id);

-- Parents can view children's interactions
CREATE POLICY "Parents can view children interactions"
  ON public.learning_interactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN profiles parent_profile ON parent_profile.user_id = auth.uid()
    WHERE p.user_id = learning_interactions.user_id AND p.parent_id = parent_profile.id
  ));

-- RLS Policies for learner_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.learner_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences"
  ON public.learner_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.learner_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Parents can view children's preferences
CREATE POLICY "Parents can view children preferences"
  ON public.learner_preferences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN profiles parent_profile ON parent_profile.user_id = auth.uid()
    WHERE p.user_id = learner_preferences.user_id AND p.parent_id = parent_profile.id
  ));

-- RLS Policies for topic_mastery
CREATE POLICY "Users can view their own mastery"
  ON public.topic_mastery FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mastery"
  ON public.topic_mastery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mastery"
  ON public.topic_mastery FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mastery"
  ON public.topic_mastery FOR DELETE
  USING (auth.uid() = user_id);

-- Parents can view children's mastery
CREATE POLICY "Parents can view children mastery"
  ON public.topic_mastery FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN profiles parent_profile ON parent_profile.user_id = auth.uid()
    WHERE p.user_id = topic_mastery.user_id AND p.parent_id = parent_profile.id
  ));

-- Create trigger for updated_at
CREATE TRIGGER update_learner_preferences_updated_at
  BEFORE UPDATE ON public.learner_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_topic_mastery_updated_at
  BEFORE UPDATE ON public.topic_mastery
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();