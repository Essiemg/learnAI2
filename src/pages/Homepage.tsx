import { Brain, Calendar, Trophy, ArrowRight, BookOpen, Zap, Heart, Target, Shield, Sparkles, GraduationCap, School, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    icon: Brain,
    title: "AI Tutor",
    description: "Get personalized help with any subject using Socratic teaching methods",
    href: "/tutor",
  },
  {
    icon: BookOpen,
    title: "Flashcards",
    description: "AI-generated flashcards that adapt to your learning progress",
    href: "/flashcards",
  },
  {
    icon: Trophy,
    title: "Quizzes",
    description: "Test your knowledge with AI-powered quizzes on any topic",
    href: "/quizzes",
  },
  {
    icon: Calendar,
    title: "Study Streaks",
    description: "Track your progress and maintain your learning momentum",
    href: "/calendar",
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Learn Faster",
    description: "Toki adapts to your pace, helping you grasp concepts quickly and efficiently.",
  },
  {
    icon: Heart,
    title: "Build Confidence",
    description: "Get encouragement and support as you work through challenging problems.",
  },
  {
    icon: Target,
    title: "Stay on Track",
    description: "Set goals, track progress, and celebrate your achievements along the way.",
  },
  {
    icon: Shield,
    title: "Safe Learning",
    description: "A safe, ad-free environment designed specifically for learners of all ages.",
  },
];

const educationLevels = [
  {
    icon: School,
    title: "Primary",
    grades: "Grades 1-8",
    description: "Build strong foundations",
  },
  {
    icon: GraduationCap,
    title: "High School",
    grades: "Grades 9-12",
    description: "Excel in advanced subjects",
  },
  {
    icon: BookOpenCheck,
    title: "College",
    grades: "All Years & Majors",
    description: "Master complex concepts",
  },
];

export default function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-full">
      {/* Hero Section - Centered High-Impact */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />

        <div className="relative max-w-7xl mx-auto px-6 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-muted/50 backdrop-blur-sm animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
            New: Live Voice Tutoring is here!
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-tight animate-fade-in-up delay-100">
            The AI Tutor That Actually
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-gradient">
              Helps You Understand
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up delay-200">
            Stop just getting answers. Start mastering concepts. Upload any homework, lecture, or textbook, and Toki will turn it into personalized quizzes, flashcards, and interactive tutoring sessions instantly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-fade-in-up delay-300">
            <Button
              size="lg"
              onClick={() => navigate("/tutor")}
              className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105"
            >
              Start Learning for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            {!user && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/signup")}
                className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50 transition-all"
              >
                View Demo
              </Button>
            )}
          </div>

          {/* Platform Preview Mockup */}
          <div className="mt-20 relative mx-auto max-w-5xl rounded-xl border bg-background shadow-2xl overflow-hidden animate-fade-in-up delay-500 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-accent/10 pointer-events-none" />

            {/* Window Controls */}
            <div className="h-10 border-b bg-muted/30 flex items-center px-4 gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400/80" />
              <div className="h-3 w-3 rounded-full bg-amber-400/80" />
              <div className="h-3 w-3 rounded-full bg-green-400/80" />
              <div className="ml-4 h-5 w-64 rounded-md bg-muted/50" />
            </div>

            {/* Mock Interface Content */}
            <div className="grid md:grid-cols-[280px_1fr] h-[400px] md:h-[600px] bg-background">
              {/* Mock Sidebar */}
              <div className="border-r bg-muted/10 p-4 hidden md:flex flex-col gap-4">
                <div className="space-y-2">
                  <div className="h-8 w-full rounded-md bg-primary/10 flex items-center px-3 text-primary font-medium text-sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Tutor
                  </div>
                  <div className="h-8 w-full rounded-md hover:bg-muted/50 flex items-center px-3 text-muted-foreground text-sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Flashcards
                  </div>
                  <div className="h-8 w-full rounded-md hover:bg-muted/50 flex items-center px-3 text-muted-foreground text-sm">
                    <Trophy className="h-4 w-4 mr-2" />
                    Quizzes
                  </div>
                </div>

                <div className="mt-auto p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/10">
                  <div className="text-xs font-semibold text-primary mb-1">Weekly Streak</div>
                  <div className="text-2xl font-bold">5 Days 🔥</div>
                </div>
              </div>

              {/* Mock Chat Area */}
              <div className="flex flex-col">
                <div className="flex-1 p-6 space-y-6 overflow-hidden relative">
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] shadow-md">
                      <p>Can you explain photosynthesis like I'm 10?</p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-sm">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div className="bg-muted px-6 py-4 rounded-2xl rounded-tl-sm max-w-[85%] border shadow-sm space-y-3">
                      <p>Currently, think of a plant like a tiny solar-powered chef! 👨‍🍳☀️</p>
                      <p>Here's the recipe for its food:</p>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><strong>Sunlight</strong> (The energy)</li>
                        <li><strong>Water</strong> (From the soil)</li>
                        <li><strong>Air</strong> (Carbon dioxide)</li>
                      </ul>
                      <p>The plant mixes these in its leaves (the kitchen) to make sugar for energy and releases oxygen for us to breathe! 🌱</p>
                    </div>
                  </div>

                  {/* Floating Elements (Visual Interest) */}
                  <div className="absolute bottom-20 right-10 p-4 bg-card rounded-xl border shadow-lg animate-bounce duration-[3000ms] hidden lg:block">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">Quiz Aced!</div>
                        <div className="text-xs text-muted-foreground">Photosynthesis Basics</div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-20 left-10 p-3 bg-card rounded-xl border shadow-lg animate-pulse hidden lg:block">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span>Insight detected</span>
                    </div>
                  </div>

                </div>

                {/* Mock Input */}
                <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
                  <div className="h-12 border rounded-full bg-muted/30 px-4 flex items-center justify-between text-muted-foreground/50 text-sm">
                    <span>Ask Toki anything...</span>
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Toki?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Toki is designed with students and parents in mind, offering a safe and effective
              way to get learning help at any level.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <Card
                key={benefit.title}
                className="border-2 border-border bg-card hover:border-primary/50 transition-colors group"
              >
                <CardHeader className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <benefit.icon className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-bold">{benefit.title}</CardTitle>
                  <CardDescription className="text-sm">{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Learning Tools</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to excel in your studies, all in one place.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group cursor-pointer border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all duration-300"
                onClick={() => navigate(feature.href)}
              >
                <CardHeader className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg font-bold">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Learn{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Smarter?
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of students using Toki to master their subjects.
          </p>
          <Button size="lg" onClick={() => navigate("/tutor")} className="gap-2">
            Get Started Now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
