import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { 
  BarChart3, TrendingUp, Clock, Flame, BookOpen, Target, Award,
  MessageSquare, Brain, FileText, PenTool, BarChart, ArrowRight,
  Sparkles, GraduationCap, School, Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTopic } from "@/contexts/TopicContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEducationContext } from "@/contexts/EducationContext";
import * as Icons from "lucide-react";

// Tool configurations based on education level
const TOOLS_CONFIG = {
  primary: [
    { name: 'Ask Toki', path: '/tutor', icon: MessageSquare, description: 'Chat with your friendly tutor' },
    { name: 'Flashcards', path: '/flashcards', icon: BookOpen, description: 'Learn with fun cards' },
    { name: 'Quizzes', path: '/quizzes', icon: Brain, description: 'Test what you know' },
  ],
  high_school: [
    { name: 'AI Tutor', path: '/tutor', icon: MessageSquare, description: 'Get homework help' },
    { name: 'Flashcards', path: '/flashcards', icon: BookOpen, description: 'Master key concepts' },
    { name: 'Quizzes', path: '/quizzes', icon: Brain, description: 'Practice for exams' },
    { name: 'Summarize', path: '/summarize', icon: FileText, description: 'Condense study materials' },
    { name: 'Diagrams', path: '/diagrams', icon: BarChart, description: 'Visualize concepts' },
  ],
  undergraduate: [
    { name: 'AI Tutor', path: '/tutor', icon: MessageSquare, description: 'Advanced academic help' },
    { name: 'Flashcards', path: '/flashcards', icon: BookOpen, description: 'Memorize effectively' },
    { name: 'Quizzes', path: '/quizzes', icon: Brain, description: 'Self-assessment' },
    { name: 'Summarize', path: '/summarize', icon: FileText, description: 'Research synthesis' },
    { name: 'Diagrams', path: '/diagrams', icon: BarChart, description: 'Complex visualizations' },
    { name: 'Essays', path: '/essays', icon: PenTool, description: 'Writing feedback' },
  ],
};

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
  const { user, profile, isLoading: authLoading } = useAuth();
  const { userEducation, userSubjects, isLoading: eduLoading, needsOnboarding } = useEducationContext();
  
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

  // Load streak data from localStorage
  useEffect(() => {
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

  if (authLoading || eduLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  const educationLevel = userEducation?.education_level || 'primary';
  const tools = TOOLS_CONFIG[educationLevel];

  const getIcon = (iconName: string | null) => {
    if (!iconName) return null;
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const getLevelIcon = () => {
    switch (educationLevel) {
      case 'primary': return <School className="h-5 w-5" />;
      case 'high_school': return <BookOpen className="h-5 w-5" />;
      case 'undergraduate': return <GraduationCap className="h-5 w-5" />;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getLevelLabel = () => {
    switch (educationLevel) {
      case 'primary': return 'Primary School';
      case 'high_school': return 'High School';
      case 'undergraduate': return 'Undergraduate';
    }
  };

  const stats = [
    {
      title: "Current Streak",
      value: `${streakData.currentStreak} days`,
      icon: Flame,
      colorClass: "text-accent",
      bgClass: "bg-accent/10",
    },
    {
      title: "Tutor Sessions",
      value: activityData.tutorSessions,
      icon: BookOpen,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
    },
    {
      title: "Flashcards Studied",
      value: activityData.flashcardsStudied,
      icon: Target,
      colorClass: "text-secondary-foreground",
      bgClass: "bg-secondary",
    },
    {
      title: "Quizzes Completed",
      value: activityData.quizzesCompleted,
      icon: Award,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
    },
  ];

  const weeklyGoal = 7;
  const weeklyProgress = Math.min(
    ((activityData.tutorSessions + activityData.quizzesCompleted) % 7) / weeklyGoal * 100,
    100
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Education Context */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">
          {getGreeting()}, {profile?.display_name || 'Learner'}! 👋
        </h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          {getLevelIcon()}
          <span>{getLevelLabel()}</span>
          {userEducation?.field_of_study && (
            <>
              <span>•</span>
              <span>{userEducation.field_of_study}</span>
            </>
          )}
        </div>
      </div>

      {/* Subject Badges */}
      {userSubjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {userSubjects.map(subject => (
            <Badge key={subject.id} variant="secondary" className="flex items-center gap-1">
              {getIcon(subject.icon)}
              {subject.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgClass}`}>
                  <stat.icon className={`h-5 w-5 ${stat.colorClass}`} />
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

      {/* Quick Actions / Tools */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Study Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(tool => (
            <Link key={tool.path} to={tool.path}>
              <Card className="h-full hover:border-primary transition-colors cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <tool.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="flex items-center justify-between">
                    {tool.description}
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
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

        {/* Recent Topics */}
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

      {/* Study Sets Link */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
          <div>
            <h3 className="font-semibold text-lg">Your Study Materials</h3>
            <p className="text-sm text-muted-foreground">
              Upload documents, videos, and links to study from
            </p>
          </div>
          <Button asChild>
            <Link to="/study-sets">
              View Study Sets
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

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
            <div className="text-center p-4 rounded-lg bg-primary/10">
              <p className="text-3xl font-bold text-primary">{activityData.tutorSessions}</p>
              <p className="text-sm text-muted-foreground">Tutor Sessions</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary">
              <p className="text-3xl font-bold text-secondary-foreground">{activityData.flashcardsStudied}</p>
              <p className="text-sm text-muted-foreground">Flashcards</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-accent/20">
              <p className="text-3xl font-bold text-accent-foreground">{activityData.quizzesCompleted}</p>
              <p className="text-sm text-muted-foreground">Quizzes</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-3xl font-bold text-muted-foreground">{activityData.essaysSubmitted}</p>
              <p className="text-sm text-muted-foreground">Essays</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
