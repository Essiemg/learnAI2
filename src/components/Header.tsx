import { BookOpen, RotateCcw } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { VoiceToggle } from "./VoiceToggle";
import { GradeSelector } from "./GradeSelector";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderProps {
  onNewChat: () => void;
  hasMessages: boolean;
}

export function Header({ onNewChat, hasMessages }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight">StudyBuddy</span>
          <span className="text-xs text-muted-foreground leading-tight">Your AI Tutor</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <GradeSelector />
        
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
      </div>
    </header>
  );
}
