import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, BookOpen, Clock, GraduationCap, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ChildProfile {
  id: string;
  display_name: string;
  grade_level: number | null;
  avatar_url: string | null;
}

export default function ParentDashboard() {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      if (!profile?.id) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, grade_level, avatar_url")
        .eq("parent_id", profile.id);

      setChildren(data || []);
      setIsLoading(false);
    };

    fetchChildren();
  }, [profile?.id]);

  if (role !== "parent" && role !== "admin") {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Parent Dashboard</h1>
        <ThemeToggle />
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Welcome */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Welcome, {profile?.display_name}!
            </CardTitle>
            <CardDescription>
              Monitor your children's learning progress and manage their accounts.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Children Overview */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Your Children
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : children.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No children linked to your account yet.</p>
                <p className="text-sm mt-2">
                  Ask your children to sign up and link their account to yours.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {children.map((child) => (
                <Card key={child.id} className="card-interactive">
                  <CardContent className="flex items-center gap-4 py-4">
                    <Avatar className={`h-12 w-12 ${child.avatar_url || "bg-primary"} text-primary-foreground`}>
                      <AvatarFallback className="bg-transparent text-lg">
                        {child.display_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{child.display_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Grade {child.grade_level || "Not set"}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        <span>Active learner</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-4 w-4" />
                        <span>Recently active</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-primary">{children.length}</div>
              <p className="text-sm text-muted-foreground">Children</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-success">🌟</div>
              <p className="text-sm text-muted-foreground">Great Progress!</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
