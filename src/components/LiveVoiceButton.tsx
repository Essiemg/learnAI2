import { Phone, PhoneOff, Loader2, Mic, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LiveVoiceButtonProps {
  isLive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function LiveVoiceButton({
  isLive,
  isListening,
  isSpeaking,
  isProcessing,
  onToggle,
  disabled,
}: LiveVoiceButtonProps) {
  const getStatusText = () => {
    if (isProcessing) return "Connecting...";
    if (isSpeaking) return "AI Speaking...";
    if (isListening) return "Listening...";
    return "Start Voice Chat";
  };

  const getStatusIcon = () => {
    if (isSpeaking) return <Volume2 className="h-3 w-3 animate-pulse" />;
    if (isListening) return <Mic className="h-3 w-3 animate-pulse" />;
    return null;
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isLive ? "destructive" : "default"}
        size="sm"
        onClick={onToggle}
        disabled={disabled || isProcessing}
        className={cn(
          "gap-2 transition-all",
          isLive && !isProcessing && "animate-pulse"
        )}
      >
        {isLive ? (
          <>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PhoneOff className="h-4 w-4" />
            )}
            End Call
          </>
        ) : (
          <>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            Go Live
          </>
        )}
      </Button>
      
      {isLive && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {getStatusIcon()}
          <span className={cn(isListening || isSpeaking ? "animate-pulse" : "")}>
            {getStatusText()}
          </span>
        </div>
      )}
    </div>
  );
}
