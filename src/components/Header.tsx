import { BookOpen, RotateCcw, User, LogIn } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { VoiceToggle } from "./VoiceToggle";
import { GradeSelector } from "./GradeSelector";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  onNewChat: () => void;
  hasMessages: boolean;
}

export function Header({ onNewChat, hasMessages }: HeaderProps) {
  const { profile, user, role } = useAuth();
  const navigate = useNavigate();

  const initials = profile?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight">StudyBuddy</span>
          <span className="text-xs text-muted-foreground leading-tight">Your AI Tutor</span>
        </div>
      </Link>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {role === "child" && <GradeSelector />}
        
        {hasMessages && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={onNewChat}
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start new chat</TooltipContent>
          </Tooltip>
        )}
        
        <VoiceToggle />
        <ThemeToggle />

        {user ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => navigate("/profile")}
              >
                <Avatar className={`h-8 w-8 ${profile?.avatar_url || "bg-primary"} text-primary-foreground text-xs`}>
                  <AvatarFallback className="bg-transparent">{initials || <User className="h-4 w-4" />}</AvatarFallback>
                </Avatar>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{profile?.display_name || "Profile"}</TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/login")}>
            <LogIn className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
