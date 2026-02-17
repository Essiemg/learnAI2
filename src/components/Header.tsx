import { RotateCcw, User, LogIn, Plus } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { VoiceToggle } from "./VoiceToggle";
import { GradeSelector } from "./GradeSelector";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
        <div className="h-10 w-10 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 p-0.5">
          <img
            src="/owl - illustrationImage.png"
            alt="Toki Logo"
            className="h-full w-full object-cover rounded-md"
          />
        </div>
        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
          Toki
        </span>
      </Link>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {role === "child" && <GradeSelector />}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={onNewChat}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start new chat</TooltipContent>
        </Tooltip>

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
                <Avatar className="h-8 w-8 text-primary-foreground text-xs">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.display_name || "Profile"} />
                  ) : null}
                  <AvatarFallback className="bg-primary">{initials || <User className="h-4 w-4" />}</AvatarFallback>
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
