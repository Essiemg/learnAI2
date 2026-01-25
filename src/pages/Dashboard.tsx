import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Clock, Flame, BookOpen, Target, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTopic } from "@/contexts/TopicContext";
import { TopicSelector } from "@/components/TopicSelector";
import { useAuth } from "@/contexts/AuthContext";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
}

interface ActivityData {
  tutorSessions: number;
  flashcardsStudied: number;
  quizzesCompleted: number;
  essaysSubmitted: number;
}

export default function Dashboard() {
  const { currentTopic } = useTopic();
  const { profile } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
  });
  const [activityData, setActivityData] = useState<ActivityData>({
    tutorSessions: 0,
    flashcardsStudied: 0,
    quizzesCompleted: 0,
    essaysSubmitted: 0,
  });

  // Load streak data from localStorage (with migration)
  useEffect(() => {
    // Migrate old keys
    const oldStreaks = localStorage.getItem("studybuddy_streaks");
    if (oldStreaks && !localStorage.getItem("toki_streaks")) {
      localStorage.setItem("toki_streaks", oldStreaks);
      localStorage.removeItem("studybuddy_streaks");
    }
    const oldActivity = localStorage.getItem("studybuddy_activity");
    if (oldActivity && !localStorage.getItem("toki_activity")) {
      localStorage.setItem("toki_activity", oldActivity);
      localStorage.removeItem("studybuddy_activity");
    }

    const stored = localStorage.getItem("toki_streaks");
    if (stored) {
      try {
        setStreakData(JSON.parse(stored));
      } catch {}
    }

    const activity = localStorage.getItem("toki_activity");
    if (activity) {
      try {
        setActivityData(JSON.parse(activity));
      } catch {}
    }
  }, []);

  const stats = [
    {
      title: "Current Streak",
      value: `${streakData.currentStreak} days`,
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Tutor Sessions",
      value: activityData.tutorSessions,
      icon: BookOpen,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Flashcards Studied",
      value: activityData.flashcardsStudied,
      icon: Target,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Quizzes Completed",
      value: activityData.quizzesCompleted,
      icon: Award,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  const weeklyGoal = 7; // 7 activities per week
  const weeklyProgress = Math.min(
    ((activityData.tutorSessions + activityData.quizzesCompleted) % 7) / weeklyGoal * 100,
    100
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}! Here's your learning progress.
          </p>
        </div>
        <TopicSelector placeholder="Filter by topic..." />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Goal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Weekly Progress
            </CardTitle>
            <CardDescription>
              Complete 7 learning activities this week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="text-muted-foreground">{Math.round(weeklyProgress)}%</span>
              </div>
              <Progress value={weeklyProgress} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Longest Streak</p>
                <p className="text-2xl font-bold">{streakData.longestStreak} days</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total Study Days</p>
                <p className="text-2xl font-bold">{streakData.totalDays} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Topics
            </CardTitle>
            <CardDescription>Continue where you left off</CardDescription>
          </CardHeader>
          <CardContent>
            {currentTopic ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="font-medium">{currentTopic.name}</p>
                  <p className="text-xs text-muted-foreground">{currentTopic.subject}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Current topic selected. Continue learning in AI Tutor, Flashcards, or Quizzes.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a topic to start tracking your progress on specific subjects.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Activity Breakdown
          </CardTitle>
          <CardDescription>Your learning activities summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-blue-500/10">
              <p className="text-3xl font-bold text-blue-500">{activityData.tutorSessions}</p>
              <p className="text-sm text-muted-foreground">Tutor Sessions</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-500/10">
              <p className="text-3xl font-bold text-purple-500">{activityData.flashcardsStudied}</p>
              <p className="text-sm text-muted-foreground">Flashcards</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-500/10">
              <p className="text-3xl font-bold text-green-500">{activityData.quizzesCompleted}</p>
              <p className="text-sm text-muted-foreground">Quizzes</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-500/10">
              <p className="text-3xl font-bold text-orange-500">{activityData.essaysSubmitted}</p>
              <p className="text-sm text-muted-foreground">Essays</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
