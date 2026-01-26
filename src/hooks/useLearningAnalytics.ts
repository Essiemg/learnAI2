import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { 
  LearningInteraction, 
  LearnerPreferences, 
  TopicMastery,
  LearnerProfile,
  ConfidenceLevel,
  LearningStyle
} from "@/types/learningAnalytics";

// Signals that indicate confusion or struggle
const CONFUSION_SIGNALS = [
  "don't understand",
  "confused",
  "what do you mean",
  "explain again",
  "still don't get",
  "can you repeat",
  "i'm lost",
  "huh?",
  "???",
  "not sure",
  "help me understand",
  "i don't know",
];

// Signals that indicate confidence
const CONFIDENCE_SIGNALS = [
  "i understand",
  "got it",
  "makes sense",
  "i see",
  "okay, so",
  "that's clear",
  "thanks, i understand now",
  "perfect",
  "ah, i get it",
];

export function useLearningAnalytics() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<LearnerPreferences | null>(null);
  const [topicMastery, setTopicMastery] = useState<TopicMastery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionStats, setCurrentSessionStats] = useState({
    explanationCount: 0,
    followUpCount: 0,
    startTime: Date.now(),
  });

  // Load learner preferences and mastery data
  useEffect(() => {
    if (user) {
      loadPreferences();
      loadTopicMastery();
    }
  }, [user]);

  const loadPreferences = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("learner_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPreferences(data as unknown as LearnerPreferences);
      } else {
        // Create default preferences for new users
        await createDefaultPreferences();
      }
    } catch (error) {
      console.error("Error loading learner preferences:", error);
    }
  }, [user]);

  const createDefaultPreferences = async () => {
    if (!user) return;

    const defaultPrefs = {
      user_id: user.id,
      preferred_style: "mixed" as LearningStyle,
      average_explanation_depth: 2,
      prefers_examples: true,
      prefers_analogies: true,
      prefers_step_by_step: true,
      prefers_practice_problems: false,
      average_confidence: "neutral" as ConfidenceLevel,
      total_interactions: 0,
      total_topics_covered: 0,
      struggling_topics: [],
      strong_topics: [],
    };

    try {
      const { data, error } = await supabase
        .from("learner_preferences")
        .insert(defaultPrefs)
        .select()
        .single();

      if (error) throw error;
      setPreferences(data as unknown as LearnerPreferences);
    } catch (error) {
      console.error("Error creating default preferences:", error);
    }
  };

  const loadTopicMastery = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("topic_mastery")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setTopicMastery((data || []) as unknown as TopicMastery[]);
    } catch (error) {
      console.error("Error loading topic mastery:", error);
    }
  }, [user]);

  // Analyze a user message to detect confusion/confidence signals
  const analyzeMessage = useCallback((message: string): ConfidenceLevel => {
    const lowerMessage = message.toLowerCase();
    
    // Check for confusion signals
    for (const signal of CONFUSION_SIGNALS) {
      if (lowerMessage.includes(signal)) {
        return "confused";
      }
    }
    
    // Check for confidence signals
    for (const signal of CONFIDENCE_SIGNALS) {
      if (lowerMessage.includes(signal)) {
        return "confident";
      }
    }
    
    // Check if it's a follow-up question (often indicates uncertainty)
    if (lowerMessage.includes("?") && currentSessionStats.explanationCount > 0) {
      return "uncertain";
    }
    
    return "neutral";
  }, [currentSessionStats.explanationCount]);

  // Track a learning interaction
  const trackInteraction = useCallback(async (
    topic: string,
    userMessage: string,
    sessionId?: string,
    subjectId?: string
  ) => {
    if (!user) return;

    const confidence = analyzeMessage(userMessage);
    const isFollowUp = currentSessionStats.explanationCount > 0;
    
    // Update session stats
    setCurrentSessionStats(prev => ({
      ...prev,
      explanationCount: prev.explanationCount + 1,
      followUpCount: isFollowUp ? prev.followUpCount + 1 : prev.followUpCount,
    }));

    const timeSpent = Math.floor((Date.now() - currentSessionStats.startTime) / 1000);

    try {
      // Record the interaction
      await supabase.from("learning_interactions").insert({
        user_id: user.id,
        session_id: sessionId,
        topic,
        subject_id: subjectId,
        interaction_type: isFollowUp ? "follow_up" : "question",
        explanation_count: currentSessionStats.explanationCount + 1,
        follow_up_count: isFollowUp ? currentSessionStats.followUpCount + 1 : 0,
        confidence_indicator: confidence,
        time_spent_seconds: timeSpent,
      });

      // Update topic mastery
      await updateTopicMastery(topic, confidence, subjectId);

      // Periodically update preferences (every 5 interactions)
      if ((currentSessionStats.explanationCount + 1) % 5 === 0) {
        await analyzeAndUpdatePreferences();
      }
    } catch (error) {
      console.error("Error tracking interaction:", error);
    }
  }, [user, currentSessionStats, analyzeMessage]);

  // Update mastery level for a topic
  const updateTopicMastery = async (
    topic: string,
    confidence: ConfidenceLevel,
    subjectId?: string
  ) => {
    if (!user) return;

    const isStruggling = confidence === "confused" || confidence === "uncertain";
    
    try {
      // Try to get existing mastery record
      const { data: existing } = await supabase
        .from("topic_mastery")
        .select("*")
        .eq("user_id", user.id)
        .eq("topic", topic)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const newMastery = calculateNewMastery(
          (existing as unknown as TopicMastery).mastery_level,
          confidence
        );
        
        await supabase
          .from("topic_mastery")
          .update({
            mastery_level: newMastery,
            times_studied: (existing as unknown as TopicMastery).times_studied + 1,
            times_struggled: isStruggling 
              ? (existing as unknown as TopicMastery).times_struggled + 1 
              : (existing as unknown as TopicMastery).times_struggled,
            last_confidence: confidence,
          })
          .eq("id", (existing as unknown as TopicMastery).id);
      } else {
        // Create new mastery record
        const initialMastery = confidence === "confident" ? 30 
          : confidence === "mastered" ? 50 
          : confidence === "confused" ? 5 
          : 15;

        await supabase.from("topic_mastery").insert({
          user_id: user.id,
          topic,
          subject_id: subjectId,
          mastery_level: initialMastery,
          times_studied: 1,
          times_struggled: isStruggling ? 1 : 0,
          last_confidence: confidence,
        });
      }

      await loadTopicMastery();
    } catch (error) {
      console.error("Error updating topic mastery:", error);
    }
  };

  // Calculate new mastery level based on current level and interaction
  const calculateNewMastery = (currentMastery: number, confidence: ConfidenceLevel): number => {
    const adjustments: Record<ConfidenceLevel, number> = {
      mastered: 15,
      confident: 10,
      neutral: 3,
      uncertain: -5,
      confused: -10,
    };

    const adjustment = adjustments[confidence];
    const newMastery = Math.max(0, Math.min(100, currentMastery + adjustment));
    return newMastery;
  };

  // Analyze interactions and update learner preferences
  const analyzeAndUpdatePreferences = async () => {
    if (!user) return;

    try {
      // Get recent interactions (last 50)
      const { data: interactions } = await supabase
        .from("learning_interactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!interactions || interactions.length < 5) return;

      const typedInteractions = interactions as unknown as LearningInteraction[];

      // Calculate average explanation depth needed
      const avgExplanations = typedInteractions.reduce(
        (sum, i) => sum + i.explanation_count, 0
      ) / typedInteractions.length;
      
      const explanationDepth = avgExplanations > 4 ? 3 : avgExplanations > 2 ? 2 : 1;

      // Calculate average confidence
      const confidenceScores: Record<ConfidenceLevel, number> = {
        confused: 1, uncertain: 2, neutral: 3, confident: 4, mastered: 5,
      };
      const avgConfidenceScore = typedInteractions.reduce(
        (sum, i) => sum + (confidenceScores[i.confidence_indicator] || 3), 0
      ) / typedInteractions.length;
      
      const avgConfidence: ConfidenceLevel = avgConfidenceScore < 2 ? "confused"
        : avgConfidenceScore < 2.5 ? "uncertain"
        : avgConfidenceScore < 3.5 ? "neutral"
        : avgConfidenceScore < 4.5 ? "confident"
        : "mastered";

      // Determine preferred learning style based on patterns
      const followUpRatio = typedInteractions.filter(i => i.interaction_type === "follow_up").length 
        / typedInteractions.length;
      
      const preferredStyle: LearningStyle = followUpRatio > 0.5 
        ? "step_by_step" 
        : avgConfidenceScore > 3.5 
          ? "conceptual" 
          : "mixed";

      // Get topics that user struggles with or excels at
      const { data: mastery } = await supabase
        .from("topic_mastery")
        .select("topic, mastery_level, times_struggled")
        .eq("user_id", user.id);

      const typedMastery = (mastery || []) as unknown as TopicMastery[];
      const strugglingTopics = typedMastery
        .filter(t => t.mastery_level < 30 || t.times_struggled > 2)
        .map(t => t.topic);
      const strongTopics = typedMastery
        .filter(t => t.mastery_level > 70)
        .map(t => t.topic);

      // Count unique topics
      const uniqueTopics = new Set(typedInteractions.map(i => i.topic)).size;

      // Update preferences
      await supabase
        .from("learner_preferences")
        .update({
          preferred_style: preferredStyle,
          average_explanation_depth: explanationDepth,
          prefers_step_by_step: followUpRatio > 0.3,
          average_confidence: avgConfidence,
          total_interactions: typedInteractions.length,
          total_topics_covered: uniqueTopics,
          struggling_topics: strugglingTopics,
          strong_topics: strongTopics,
          last_analyzed_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      await loadPreferences();
    } catch (error) {
      console.error("Error analyzing preferences:", error);
    }
  };

  // Build learner profile for AI context
  const buildLearnerProfile = useCallback((
    educationLevel: 'primary' | 'high_school' | 'undergraduate',
    fieldOfStudy?: string,
    subjects?: string[],
    currentTopic?: string
  ): LearnerProfile => {
    const topicMasteryRecord = currentTopic 
      ? topicMastery.find(t => t.topic.toLowerCase() === currentTopic.toLowerCase())
      : undefined;

    return {
      educationLevel,
      fieldOfStudy,
      subjects: subjects || [],
      preferences: {
        style: preferences?.preferred_style || "mixed",
        explanationDepth: preferences?.average_explanation_depth || 2,
        prefersExamples: preferences?.prefers_examples ?? true,
        prefersAnalogies: preferences?.prefers_analogies ?? true,
        prefersStepByStep: preferences?.prefers_step_by_step ?? true,
        prefersPracticeProblems: preferences?.prefers_practice_problems ?? false,
      },
      history: {
        totalInteractions: preferences?.total_interactions || 0,
        topicsCovered: preferences?.total_topics_covered || 0,
        averageConfidence: preferences?.average_confidence || "neutral",
        strugglingTopics: preferences?.struggling_topics || [],
        strongTopics: preferences?.strong_topics || [],
      },
      currentTopic: topicMasteryRecord ? {
        name: topicMasteryRecord.topic,
        masteryLevel: topicMasteryRecord.mastery_level,
        timesStudied: topicMasteryRecord.times_studied,
        timesStruggled: topicMasteryRecord.times_struggled,
      } : undefined,
    };
  }, [preferences, topicMastery]);

  // Reset session stats (call when starting new conversation)
  const resetSessionStats = useCallback(() => {
    setCurrentSessionStats({
      explanationCount: 0,
      followUpCount: 0,
      startTime: Date.now(),
    });
  }, []);

  // Mark response as helpful/not helpful
  const markResponseHelpful = useCallback(async (
    interactionId: string,
    helpful: boolean
  ) => {
    if (!user) return;

    try {
      await supabase
        .from("learning_interactions")
        .update({ response_helpful: helpful })
        .eq("id", interactionId)
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error marking response:", error);
    }
  }, [user]);

  return {
    preferences,
    topicMastery,
    isLoading,
    currentSessionStats,
    trackInteraction,
    buildLearnerProfile,
    resetSessionStats,
    markResponseHelpful,
    analyzeAndUpdatePreferences,
    loadPreferences,
    loadTopicMastery,
  };
}
