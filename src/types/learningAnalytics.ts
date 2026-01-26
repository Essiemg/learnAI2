export type LearningStyle = 'step_by_step' | 'conceptual' | 'practice_oriented' | 'visual' | 'mixed';
export type ConfidenceLevel = 'confused' | 'uncertain' | 'neutral' | 'confident' | 'mastered';

export interface LearningInteraction {
  id: string;
  user_id: string;
  session_id?: string;
  topic: string;
  subject_id?: string;
  interaction_type: 'question' | 'follow_up' | 'clarification' | 'practice';
  explanation_count: number;
  follow_up_count: number;
  confidence_indicator: ConfidenceLevel;
  response_helpful?: boolean;
  time_spent_seconds?: number;
  created_at: string;
}

export interface LearnerPreferences {
  id: string;
  user_id: string;
  preferred_style: LearningStyle;
  average_explanation_depth: number; // 1=simple, 2=moderate, 3=detailed
  prefers_examples: boolean;
  prefers_analogies: boolean;
  prefers_step_by_step: boolean;
  prefers_practice_problems: boolean;
  average_confidence: ConfidenceLevel;
  total_interactions: number;
  total_topics_covered: number;
  struggling_topics: string[];
  strong_topics: string[];
  last_analyzed_at: string;
  created_at: string;
  updated_at: string;
}

export interface TopicMastery {
  id: string;
  user_id: string;
  topic: string;
  subject_id?: string;
  mastery_level: number; // 0-100
  times_studied: number;
  times_struggled: number;
  last_confidence: ConfidenceLevel;
  created_at: string;
  updated_at: string;
}

// Data passed to AI for adaptive responses
export interface LearnerProfile {
  educationLevel: 'primary' | 'high_school' | 'undergraduate';
  fieldOfStudy?: string;
  subjects: string[];
  preferences: {
    style: LearningStyle;
    explanationDepth: number;
    prefersExamples: boolean;
    prefersAnalogies: boolean;
    prefersStepByStep: boolean;
    prefersPracticeProblems: boolean;
  };
  history: {
    totalInteractions: number;
    topicsCovered: number;
    averageConfidence: ConfidenceLevel;
    strugglingTopics: string[];
    strongTopics: string[];
  };
  currentTopic?: {
    name: string;
    masteryLevel: number;
    timesStudied: number;
    timesStruggled: number;
  };
}
