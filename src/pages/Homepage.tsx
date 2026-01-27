import { Brain, Calendar, Trophy, ArrowRight, BookOpen, Users, Shield, Zap, Heart, Target } from "lucide-react";
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
    description: "A safe, ad-free environment designed specifically for young learners.",
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
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Meet{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Toki
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Your personal AI homework companion that helps you understand, not just answer. 
            Built for kids in grades K-8.
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

      {/* About Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">About Toki</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Toki is an AI-powered homework companion designed to help kids learn how to think, 
              not just get answers. Using the Socratic method, Toki guides students through problems 
              step-by-step, building understanding and confidence along the way.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Always Available</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">K-8</div>
              <div className="text-muted-foreground">Grade Levels</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">15+</div>
              <div className="text-muted-foreground">Subjects</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Toki?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Toki is designed with students and parents in mind, offering a safe and effective 
              way to get homework help.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <Card
                key={benefit.title}
                className="border-2 border-border bg-card hover:border-primary/50 transition-colors"
              >
                <CardHeader className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
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
      <section className="py-16 px-6 bg-muted/30">
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
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            Toki
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join Toki today to learn Smarter.
          </p>
          <Button size="lg" onClick={() => navigate("/tutor")}>
            Get Started Now
          </Button>
        </div>
      </section>
    </div>
  );
}
