import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      // Fetch children linked to this parent (primary only)
      const { data: childProfiles } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, grade_level, avatar_url")
        .eq("parent_id", profile.id);

      if (!childProfiles || childProfiles.length === 0) {
        setChildren([]);
        setIsLoading(false);
        return;
      }

      // Filter to only primary students
      const childUserIds = childProfiles.map(c => c.user_id);
      const { data: educationData } = await supabase
        .from("user_education")
        .select("user_id, education_level")
        .in("user_id", childUserIds)
        .eq("education_level", "primary");

      const primaryChildIds = new Set(educationData?.map(e => e.user_id) || []);
      const primaryChildren = childProfiles.filter(c => primaryChildIds.has(c.user_id));

      if (primaryChildren.length === 0) {
        setChildren([]);
        setIsLoading(false);
        return;
      }

      // Fetch analytics for each primary child
      const childAnalytics: ChildAnalytics[] = await Promise.all(
        primaryChildren.map(async (child) => {
          // Topic mastery
          const { data: mastery } = await supabase
            .from("topic_mastery")
            .select("*")
            .eq("user_id", child.user_id)
            .order("updated_at", { ascending: false });

          // Learner preferences
          const { data: prefs } = await supabase
            .from("learner_preferences")
            .select("*")
            .eq("user_id", child.user_id)
            .maybeSingle();

          // Recent quiz sessions
          const { data: quizzes } = await supabase
            .from("quiz_sessions")
            .select("id, topic, created_at, score, is_completed")
            .eq("user_id", child.user_id)
            .order("created_at", { ascending: false })
            .limit(5);

          // Recent flashcard sessions
          const { data: flashcards } = await supabase
            .from("flashcard_sessions")
            .select("id, topic, created_at")
            .eq("user_id", child.user_id)
            .order("created_at", { ascending: false })
            .limit(5);

          // Recent learning interactions (this week)
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          const { data: interactions } = await supabase
            .from("learning_interactions")
            .select("*")
            .eq("user_id", child.user_id)
            .gte("created_at", oneWeekAgo.toISOString());

          // Build recent activity
          const recentActivity: RecentActivity[] = [
            ...(quizzes?.map(q => ({
              id: q.id,
              type: 'quiz' as const,
              topic: q.topic,
              created_at: q.created_at,
              details: { score: q.score ?? undefined }
            })) || []),
            ...(flashcards?.map(f => ({
              id: f.id,
              type: 'flashcard' as const,
              topic: f.topic,
              created_at: f.created_at
            })) || [])
          ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
           .slice(0, 10);

          // Calculate weekly stats
          const weeklyInteractions = interactions || [];
          const topicsThisWeek = new Set(weeklyInteractions.map(i => i.topic));
          const totalTime = weeklyInteractions.reduce((sum, i) => sum + (i.time_spent_seconds || 0), 0);
          
          const confidenceCounts: Record<string, number> = {};
          weeklyInteractions.forEach(i => {
            if (i.confidence_indicator) {
              confidenceCounts[i.confidence_indicator] = (confidenceCounts[i.confidence_indicator] || 0) + 1;
            }
          });
          const avgConfidence = Object.entries(confidenceCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

          return {
            profile: child,
            educationLevel: 'primary',
            topicMastery: mastery || [],
            preferences: prefs ? {
              preferred_style: prefs.preferred_style || 'mixed',
              average_explanation_depth: prefs.average_explanation_depth || 2,
              prefers_examples: prefs.prefers_examples ?? true,
              prefers_analogies: prefs.prefers_analogies ?? true,
              prefers_step_by_step: prefs.prefers_step_by_step ?? true,
              prefers_practice_problems: prefs.prefers_practice_problems ?? false,
              average_confidence: prefs.average_confidence || 'neutral',
              total_interactions: prefs.total_interactions || 0,
              total_topics_covered: prefs.total_topics_covered || 0,
              struggling_topics: prefs.struggling_topics || [],
              strong_topics: prefs.strong_topics || []
            } : null,
            recentActivity,
            weeklyStats: {
              totalInteractions: weeklyInteractions.length,
              topicsCovered: topicsThisWeek.size,
              averageConfidence: avgConfidence,
              timeSpentMinutes: Math.round(totalTime / 60)
            }
          };
        })
      );

      setChildren(childAnalytics);
    } catch (error) {
      console.error("Error fetching child analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  const generateLinkCode = useCallback(async () => {
    if (!profile?.user_id) return null;

    setIsGeneratingCode(true);
    try {
      // Generate code using the database function
      const { data: codeData, error: codeError } = await supabase
        .rpc("generate_parent_link_code");

      if (codeError) throw codeError;

      const newCode = codeData as string;

      // Insert the link code
      const { error: insertError } = await supabase
        .from("parent_link_codes")
        .insert({
          parent_user_id: profile.user_id,
          code: newCode
        });

      if (insertError) throw insertError;

      setLinkCode(newCode);
      return newCode;
    } catch (error) {
      console.error("Error generating link code:", error);
      return null;
    } finally {
      setIsGeneratingCode(false);
    }
  }, [profile?.user_id]);

  const fetchExistingLinkCode = useCallback(async () => {
    if (!profile?.user_id) return;

    const { data } = await supabase
      .from("parent_link_codes")
      .select("code")
      .eq("parent_user_id", profile.user_id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setLinkCode(data.code);
    }
  }, [profile?.user_id]);

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
