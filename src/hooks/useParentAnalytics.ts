import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { ConfidenceLevel, LearningStyle } from "@/types/learningAnalytics";

interface ChildProfile {
  id: string;
  user_id: string;
  display_name: string;
  grade_level: number | null;
  avatar_url: string | null;
}

interface TopicMastery {
  id: string;
  topic: string;
  mastery_level: number;
  times_studied: number;
  times_struggled: number;
  last_confidence: ConfidenceLevel;
  updated_at: string;
}

interface LearnerPreferences {
  preferred_style: LearningStyle;
  average_explanation_depth: number;
  prefers_examples: boolean;
  prefers_analogies: boolean;
  prefers_step_by_step: boolean;
  prefers_practice_problems: boolean;
  average_confidence: ConfidenceLevel;
  total_interactions: number;
  total_topics_covered: number;
  struggling_topics: string[];
  strong_topics: string[];
}

interface RecentActivity {
  id: string;
  type: 'quiz' | 'flashcard' | 'chat' | 'interaction';
  topic: string;
  created_at: string;
  details?: {
    score?: number;
    confidence?: ConfidenceLevel;
  };
}

interface ChildAnalytics {
  profile: ChildProfile;
  educationLevel: string;
  topicMastery: TopicMastery[];
  preferences: LearnerPreferences | null;
  recentActivity: RecentActivity[];
  weeklyStats: {
    totalInteractions: number;
    topicsCovered: number;
    averageConfidence: string;
    timeSpentMinutes: number;
  };
}

const CHILDREN_KEY = "learnai_children";
const LINK_CODE_KEY = "learnai_link_code";

export function useParentAnalytics() {
  const { profile } = useAuth();
  const [children, setChildren] = useState<ChildAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const fetchChildAnalytics = useCallback(async () => {
    if (!profile?.id) return;

    setIsLoading(true);

    try {
      // Load children from localStorage (placeholder for parent-child linking)
      const stored = localStorage.getItem(`${CHILDREN_KEY}_${profile.id}`);
      const childData = stored ? JSON.parse(stored) : [];
      
      // For now, return empty array - parent linking would be implemented server-side
      setChildren(childData);
    } catch (error) {
      console.error("Error fetching child analytics:", error);
      setChildren([]);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  const generateLinkCode = useCallback(async () => {
    if (!profile?.id) return null;

    setIsGeneratingCode(true);
    try {
      // Generate a random 6-character code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Store the link code
      const codeData = {
        code,
        parent_id: profile.id,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };
      localStorage.setItem(`${LINK_CODE_KEY}_${profile.id}`, JSON.stringify(codeData));
      
      setLinkCode(code);
      return code;
    } catch (error) {
      console.error("Error generating link code:", error);
      return null;
    } finally {
      setIsGeneratingCode(false);
    }
  }, [profile?.id]);

  const fetchExistingLinkCode = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const stored = localStorage.getItem(`${LINK_CODE_KEY}_${profile.id}`);
      if (stored) {
        const data = JSON.parse(stored);
        if (new Date(data.expires_at) > new Date()) {
          setLinkCode(data.code);
        }
      }
    } catch (error) {
      console.error("Error fetching link code:", error);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchChildAnalytics();
    fetchExistingLinkCode();
  }, [fetchChildAnalytics, fetchExistingLinkCode]);

  return {
    children,
    isLoading,
    linkCode,
    isGeneratingCode,
    generateLinkCode,
    refreshAnalytics: fetchChildAnalytics
  };
}
