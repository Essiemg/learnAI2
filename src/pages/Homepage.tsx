import { BookOpen, Sparkles, Brain, Calendar, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    icon: Brain,
    title: "AI Tutor",
    description: "Get personalized help with any subject using Socratic teaching methods",
    href: "/tutor",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Sparkles,
    title: "Smart Flashcards",
    description: "AI-generated flashcards that adapt to your learning progress",
    href: "/flashcards",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Trophy,
    title: "Interactive Quizzes",
    description: "Test your knowledge with AI-powered quizzes on any topic",
    href: "/quizzes",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Calendar,
    title: "Study Streaks",
    description: "Track your progress and maintain your learning momentum",
    href: "/calendar",
    color: "from-green-500 to-emerald-500",
  },
];

export default function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Smart Learning
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Learn Smarter with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              StudyBuddy
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Your personal AI tutor that helps you master any subject through interactive
            lessons, smart flashcards, and adaptive quizzes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/tutor")}
              className="gap-2"
            >
              Start Learning
              <ArrowRight className="h-4 w-4" />
            </Button>
            {!user && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/signup")}
              >
                Create Free Account
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Excel</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From personalized tutoring to progress tracking, StudyBuddy has all the
              tools to help you succeed.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50"
                onClick={() => navigate(feature.href)}
              >
                <CardHeader>
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-1">24/7</div>
              <div className="text-sm text-muted-foreground">AI Availability</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">K-12</div>
              <div className="text-sm text-muted-foreground">Grade Levels</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">15+</div>
              <div className="text-sm text-muted-foreground">Subjects</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">∞</div>
              <div className="text-sm text-muted-foreground">Practice Questions</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of students who are already learning smarter with StudyBuddy.
          </p>
          <Button size="lg" onClick={() => navigate("/tutor")}>
            Get Started Now
          </Button>
        </div>
      </section>
    </div>
  );
}
