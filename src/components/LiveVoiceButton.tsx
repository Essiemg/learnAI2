import { Phone, PhoneOff, Loader2 } from "lucide-react";
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
    if (isProcessing) return "Thinking...";
    if (isSpeaking) return "Speaking...";
    if (isListening) return "Listening...";
    return "Start Live Chat";
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isLive ? "destructive" : "default"}
        size="sm"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "gap-2 transition-all",
          isLive && "animate-pulse"
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
            <Phone className="h-4 w-4" />
            Go Live
          </>
        )}
      </Button>
      
      {isLive && (
        <span className="text-xs text-muted-foreground animate-pulse">
          {getStatusText()}
        </span>
      )}
    </div>
  );
}
