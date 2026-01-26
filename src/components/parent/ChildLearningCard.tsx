import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Brain,
  Target
} from "lucide-react";
import type { ConfidenceLevel } from "@/types/learningAnalytics";

interface ChildProfile {
  id: string;
  display_name: string;
  grade_level: number | null;
  avatar_url: string | null;
}

interface TopicMastery {
  topic: string;
  mastery_level: number;
  times_struggled: number;
}

interface WeeklyStats {
  totalInteractions: number;
  topicsCovered: number;
  averageConfidence: string;
  timeSpentMinutes: number;
}

interface ChildLearningCardProps {
  profile: ChildProfile;
  topicMastery: TopicMastery[];
  weeklyStats: WeeklyStats;
  strugglingTopics: string[];
  strongTopics: string[];
  onViewDetails?: () => void;
}

export function ChildLearningCard({
  profile,
  topicMastery,
  weeklyStats,
  strugglingTopics,
  strongTopics,
}: ChildLearningCardProps) {
  // Calculate overall progress
  const avgMastery = topicMastery.length > 0
    ? Math.round(topicMastery.reduce((sum, t) => sum + t.mastery_level, 0) / topicMastery.length)
    : 0;

  // Determine status
  const getStatus = () => {
    if (strugglingTopics.length >= 3) return { label: "Needs Attention", color: "destructive" as const };
    if (avgMastery >= 70) return { label: "Excellent", color: "default" as const };
    if (weeklyStats.totalInteractions > 10) return { label: "Active", color: "secondary" as const };
    return { label: "Getting Started", color: "outline" as const };
  };

  const status = getStatus();

  // Confidence trend
  const getConfidenceTrend = (confidence: string) => {
    const positive = ["confident", "mastered"];
    const negative = ["confused", "uncertain"];
    
    if (positive.includes(confidence)) return <TrendingUp className="h-4 w-4 text-success" />;
    if (negative.includes(confidence)) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getMasteryColor = (level: number) => {
    if (level < 30) return "bg-destructive";
    if (level < 60) return "bg-warning";
    return "bg-success";
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-4">
          <Avatar className={`h-14 w-14 ${profile.avatar_url || "bg-primary"} text-primary-foreground`}>
            <AvatarFallback className="bg-transparent text-xl font-bold">
              {profile.display_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{profile.display_name}</CardTitle>
              <Badge variant={status.color}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Grade {profile.grade_level || "Not set"}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Weekly Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center justify-center gap-1 text-primary">
              <BookOpen className="h-4 w-4" />
              <span className="font-bold">{weeklyStats.topicsCovered}</span>
            </div>
            <p className="text-xs text-muted-foreground">Topics</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center justify-center gap-1 text-primary">
              <Clock className="h-4 w-4" />
              <span className="font-bold">{weeklyStats.timeSpentMinutes}m</span>
            </div>
            <p className="text-xs text-muted-foreground">Study Time</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center justify-center gap-1">
              {getConfidenceTrend(weeklyStats.averageConfidence)}
              <span className="font-bold capitalize text-sm">{weeklyStats.averageConfidence}</span>
            </div>
            <p className="text-xs text-muted-foreground">Confidence</p>
          </div>
        </div>

        {/* Overall Mastery */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4 text-primary" />
              Overall Mastery
            </span>
            <span className="font-medium">{avgMastery}%</span>
          </div>
          <Progress value={avgMastery} className="h-2" />
        </div>

        {/* Top Topics Progress */}
        {topicMastery.slice(0, 3).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <Brain className="h-4 w-4 text-primary" />
              Recent Topics
            </p>
            {topicMastery.slice(0, 3).map((topic) => (
              <div key={topic.topic} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[180px]">{topic.topic}</span>
                  <span className="text-muted-foreground">{topic.mastery_level}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getMasteryColor(topic.mastery_level)} transition-all`}
                    style={{ width: `${topic.mastery_level}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Struggling Topics Alert */}
        {strugglingTopics.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm font-medium text-destructive mb-1">
              Needs Extra Help
            </p>
            <div className="flex flex-wrap gap-1">
              {strugglingTopics.slice(0, 3).map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs border-destructive/30">
                  {topic}
                </Badge>
              ))}
              {strugglingTopics.length > 3 && (
                <Badge variant="outline" className="text-xs border-destructive/30">
                  +{strugglingTopics.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Strong Topics */}
        {strongTopics.length > 0 && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-3">
            <p className="text-sm font-medium text-success mb-1">
              🌟 Excelling At
            </p>
            <div className="flex flex-wrap gap-1">
              {strongTopics.slice(0, 3).map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs border-success/30">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
