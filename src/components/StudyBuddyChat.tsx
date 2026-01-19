import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { useChat } from "@/hooks/useChat";
import { Header } from "./Header";
import { ChatContainer } from "./ChatContainer";
import { ChatInput } from "./ChatInput";
import { toast } from "sonner";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Shield, LogIn } from "lucide-react";

export function StudyBuddyChat() {
  const { user, profile, role, isLoading: authLoading } = useAuth();
  const { gradeLevel, setGradeLevel } = useUser();
  const navigate = useNavigate();

  // Sync grade level from profile
  useEffect(() => {
    if (profile?.grade_level && role === "child") {
      setGradeLevel(profile.grade_level);
    }
  }, [profile?.grade_level, role, setGradeLevel]);

  const effectiveGradeLevel = profile?.grade_level || gradeLevel;
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat(effectiveGradeLevel);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSend = (message: string, imageData?: string) => {
    if (effectiveGradeLevel === 0 && role === "child") {
      toast.info("Please select your grade level first! 🎓");
      return;
    }
    sendMessage(message, imageData);
  };

  // Show login prompt for non-authenticated users
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col h-screen max-h-screen bg-background">
        <Header onNewChat={clearMessages} hasMessages={false} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">Welcome to StudyBuddy! 👋</h2>
            <p className="text-muted-foreground mb-6">
              Sign in to start learning with your personal AI tutor.
            </p>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => navigate("/login")}>
                <LogIn className="mr-2 h-5 w-5" />
                Sign In
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate("/signup")}>
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard links for parents/admins
  if (role === "parent" || role === "admin") {
    return (
      <div className="flex flex-col h-screen max-h-screen bg-background">
        <Header onNewChat={clearMessages} hasMessages={messages.length > 0} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md space-y-6">
            <h2 className="text-2xl font-bold">
              Welcome, {profile?.display_name}! 🎉
            </h2>
            <p className="text-muted-foreground">
              {role === "admin"
                ? "Manage users and monitor the platform."
                : "Monitor your children's learning progress."}
            </p>
            <div className="flex flex-col gap-3">
              {role === "parent" && (
                <Button size="lg" onClick={() => navigate("/parent")}>
                  <Users className="mr-2 h-5 w-5" />
                  Parent Dashboard
                </Button>
              )}
              {role === "admin" && (
                <Button size="lg" onClick={() => navigate("/admin")}>
                  <Shield className="mr-2 h-5 w-5" />
                  Admin Dashboard
                </Button>
              )}
              <Button variant="outline" size="lg" onClick={() => navigate("/profile")}>
                Manage Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <Header onNewChat={clearMessages} hasMessages={messages.length > 0} />
      <ChatContainer messages={messages} isLoading={isLoading} userName={profile?.display_name || ""} />
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        disabled={effectiveGradeLevel === 0}
      />
    </div>
  );
}
