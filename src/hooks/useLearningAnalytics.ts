import { useState, useCallback, useEffect } from "react";
import { progressApi } from "@/lib/api";
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
      // Load progress from API instead of direct Supabase query
      const progress = await progressApi.getProgress();
      
      // Build preferences from progress data
      const prefs: LearnerPreferences = {
        id: user.id,
        user_id: user.id,
        preferred_style: "mixed" as LearningStyle,
        average_explanation_depth: 2,
        prefers_examples: true,
        prefers_analogies: true,
        prefers_step_by_step: true,
        prefers_practice_problems: false,
        average_confidence: progress.recent_accuracy > 0.7 ? "confident" : 
                           progress.recent_accuracy > 0.4 ? "neutral" : "uncertain",
        total_interactions: progress.total_interactions,
        total_topics_covered: progress.weak_subjects.length,
        struggling_topics: progress.weak_subjects.map(s => s.subject),
        strong_topics: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setPreferences(prefs);
    } catch (error) {
      console.error("Error loading learner preferences:", error);
      // Set default preferences on error
      await createDefaultPreferences();
    }
  }, [user]);

  const createDefaultPreferences = async () => {
    if (!user) return;

    const defaultPrefs: LearnerPreferences = {
      id: user.id,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Just set locally - no need to persist to DB for now
    setPreferences(defaultPrefs);
  };

  const loadTopicMastery = useCallback(async () => {
    if (!user) return;

    try {
      // Get subject breakdown from progress API
      const subjects = await progressApi.getSubjectBreakdown();
      
      // Convert to TopicMastery format
      const mastery: TopicMastery[] = subjects.map((s: any) => ({
        id: s.subject,
        user_id: user.id,
        topic: s.subject,
        subject_id: null,
        mastery_level: Math.round(s.accuracy * 100),
        times_studied: s.total_interactions,
        times_struggled: Math.round((1 - s.accuracy) * s.total_interactions),
        last_confidence: s.accuracy > 0.7 ? "confident" : 
                        s.accuracy > 0.4 ? "neutral" : "uncertain",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      
      setTopicMastery(mastery);
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

  // Track a learning interaction - simplified version
  // Interactions are now logged server-side via /api/tutor endpoint
  const trackInteraction = useCallback(async (
    topic: string,
    userMessage: string,
    sessionId?: string,
    subjectId?: string
  ) => {
    if (!user) return;

    const confidence = analyzeMessage(userMessage);
    const isFollowUp = currentSessionStats.explanationCount > 0;
    
    // Update session stats locally
    setCurrentSessionStats(prev => ({
      ...prev,
      explanationCount: prev.explanationCount + 1,
      followUpCount: isFollowUp ? prev.followUpCount + 1 : prev.followUpCount,
    }));

    // Note: Actual interaction logging happens server-side via /api/tutor
    // This function now just tracks local session stats
  }, [user, currentSessionStats, analyzeMessage]);

  // Update mastery level for a topic - now handled server-side
  const updateTopicMastery = async (
    topic: string,
    confidence: ConfidenceLevel,
    subjectId?: string
  ) => {
    // Topic mastery is now calculated server-side based on interactions
    // Just reload the data
    await loadTopicMastery();
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

  // Analyze interactions and update learner preferences - simplified
  const analyzeAndUpdatePreferences = async () => {
    if (!user) return;

    try {
      // Reload preferences from API
      await loadPreferences();
      await loadTopicMastery();
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

  // Mark response as helpful/not helpful - simplified (local only for now)
  const markResponseHelpful = useCallback(async (
    interactionId: string,
    helpful: boolean
  ) => {
    if (!user) return;
    // This would need a new API endpoint to persist
    console.log(`Response ${interactionId} marked as ${helpful ? 'helpful' : 'not helpful'}`);
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
