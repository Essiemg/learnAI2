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
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientText } from "@/components/ui/gradient-text";
import { ProgressRing } from "@/components/ui/progress-ring";
import { motion } from "framer-motion";
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
  college: [
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

  // No longer redirect to onboarding - onboarding is handled after signup
  // Dashboard shows progress even if onboarding is incomplete

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
      case 'college': return <GraduationCap className="h-5 w-5" />;
      default: return <School className="h-5 w-5" />;
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
      case 'college': return 'College';
      default: return 'Student';
    }
  };

  // Get grade or year info for display
  const getGradeInfo = () => {
    if (educationLevel === 'primary' || educationLevel === 'high_school') {
      return userEducation?.grade_level ? `Grade ${userEducation.grade_level}` : '';
    }
    if (educationLevel === 'college') {
      const year = userEducation?.college_year ? `Year ${userEducation.college_year}` : '';
      const major = userEducation?.major || '';
      return [year, major].filter(Boolean).join(' • ');
    }
    return '';
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
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <h1 className="text-2xl md:text-3xl font-bold">
          {getGreeting()}, <GradientText>{profile?.display_name || 'Learner'}</GradientText>! 👋
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
      </motion.div>

      {/* Subject Badges */}
      {userSubjects.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2"
        >
          {userSubjects.map((subject, index) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
            >
              <Badge variant="secondary" className="flex items-center gap-1 shadow-soft">
                {getIcon(subject.icon)}
                {subject.name}
              </Badge>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <AnimatedCard key={stat.title} delay={0.1 * index} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.bgClass} shadow-soft`}>
                <stat.icon className={`h-5 w-5 ${stat.colorClass}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* Quick Actions / Tools */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse-soft" />
          <GradientText variant="primary">Your Study Tools</GradientText>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool, index) => (
            <Link key={tool.path} to={tool.path}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="h-full border-border/50 hover:border-primary/50 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:shadow-glow transition-all">
                      <tool.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{tool.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="flex items-center justify-between">
                      {tool.description}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Goal */}
        <AnimatedCard delay={0.3} className="lg:col-span-2" hover={false}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Weekly Progress
                </h3>
                <p className="text-sm text-muted-foreground">
                  Complete 7 learning activities this week
                </p>
              </div>
              <ProgressRing 
                progress={weeklyProgress} 
                size={80} 
                strokeWidth={6}
                showLabel={true}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                <p className="text-sm text-muted-foreground">Longest Streak</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  {streakData.longestStreak} days
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                <p className="text-sm text-muted-foreground">Total Study Days</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  {streakData.totalDays} days
                </p>
              </div>
            </div>
          </div>
        </AnimatedCard>

        {/* Recent Topics */}
        <AnimatedCard delay={0.4} hover={false}>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Topics
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Continue where you left off</p>
          <div>
            {currentTopic ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
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
          </div>
        </AnimatedCard>
      </div>

      {/* Study Sets Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-accent/10 border-primary/20 shadow-glow overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-pink-500/5" />
          <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4 relative">
            <div>
              <h3 className="font-semibold text-lg">Your Study Materials</h3>
              <p className="text-sm text-muted-foreground">
                Upload documents, videos, and links to study from
              </p>
            </div>
            <Button asChild className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg">
              <Link to="/study-sets">
                View Study Sets
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity Breakdown */}
      <AnimatedCard delay={0.6} hover={false}>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Activity Breakdown
            </h3>
            <p className="text-sm text-muted-foreground">Your learning activities summary</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
            >
              <p className="text-3xl font-bold text-primary">{activityData.tutorSessions}</p>
              <p className="text-sm text-muted-foreground">Tutor Sessions</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20"
            >
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{activityData.flashcardsStudied}</p>
              <p className="text-sm text-muted-foreground">Flashcards</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20"
            >
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{activityData.quizzesCompleted}</p>
              <p className="text-sm text-muted-foreground">Quizzes</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-4 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/20"
            >
              <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">{activityData.essaysSubmitted}</p>
              <p className="text-sm text-muted-foreground">Essays</p>
            </motion.div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}
