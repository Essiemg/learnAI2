import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  BookOpen, 
  MessageSquare, 
  Puzzle,
  Eye,
  List
} from "lucide-react";
import type { LearningStyle, ConfidenceLevel } from "@/types/learningAnalytics";

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
}

interface RecentActivity {
  id: string;
  type: 'quiz' | 'flashcard' | 'chat' | 'interaction';
  topic: string;
  created_at: string;
  details?: {
    score?: number;
  };
}

interface LearningInsightsProps {
  childName: string;
  preferences: LearnerPreferences | null;
  recentActivity: RecentActivity[];
}

export function LearningInsights({ childName, preferences, recentActivity }: LearningInsightsProps) {
  const getStyleIcon = (style: LearningStyle) => {
    switch (style) {
      case 'step_by_step': return <List className="h-4 w-4" />;
      case 'conceptual': return <Lightbulb className="h-4 w-4" />;
      case 'practice_oriented': return <Puzzle className="h-4 w-4" />;
      case 'visual': return <Eye className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getStyleLabel = (style: LearningStyle) => {
    switch (style) {
      case 'step_by_step': return 'Step-by-Step';
      case 'conceptual': return 'Conceptual Thinker';
      case 'practice_oriented': return 'Practice-Oriented';
      case 'visual': return 'Visual Learner';
      default: return 'Mixed Approach';
    }
  };

  const getDepthLabel = (depth: number) => {
    if (depth <= 1) return 'Simple explanations';
    if (depth <= 2) return 'Moderate detail';
    return 'Detailed explanations';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <Puzzle className="h-4 w-4 text-primary" />;
      case 'flashcard': return <BookOpen className="h-4 w-4 text-accent" />;
      case 'chat': return <MessageSquare className="h-4 w-4 text-success" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Learning Style Card */}
      {preferences && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              {childName}'s Learning Style
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Style */}
            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
              {getStyleIcon(preferences.preferred_style)}
              <div>
                <p className="font-medium">{getStyleLabel(preferences.preferred_style)}</p>
                <p className="text-sm text-muted-foreground">
                  {getDepthLabel(preferences.average_explanation_depth)}
                </p>
              </div>
            </div>

            {/* Preferences */}
            <div className="flex flex-wrap gap-2">
              {preferences.prefers_examples && (
                <Badge variant="secondary">Loves Examples</Badge>
              )}
              {preferences.prefers_analogies && (
                <Badge variant="secondary">Gets Analogies</Badge>
              )}
              {preferences.prefers_step_by_step && (
                <Badge variant="secondary">Step-by-Step</Badge>
              )}
              {preferences.prefers_practice_problems && (
                <Badge variant="secondary">Practice Problems</Badge>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 text-center pt-2 border-t">
              <div>
                <p className="text-2xl font-bold text-primary">{preferences.total_interactions}</p>
                <p className="text-xs text-muted-foreground">Total Questions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{preferences.total_topics_covered}</p>
                <p className="text-xs text-muted-foreground">Topics Explored</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.topic}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {activity.type}
                      {activity.details?.score !== undefined && ` • Score: ${activity.details.score}%`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(activity.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!preferences && recentActivity.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No learning data yet.</p>
            <p className="text-sm mt-1">
              {childName} will start building their learning profile as they use the app.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
