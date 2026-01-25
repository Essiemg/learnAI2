import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Bot, User, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeech } from "@/hooks/useSpeech";
import { useUser } from "@/contexts/UserContext";
import { useEffect, useRef } from "react";

interface ChatMessageProps {
  message: Message;
  isLatest?: boolean;
}

export function ChatMessage({ message, isLatest }: ChatMessageProps) {
  const { voiceEnabled } = useUser();
  const { speak, isSpeaking, isLoading, stop } = useSpeech();
  const isUser = message.role === "user";
  const hasSpokenRef = useRef(false);

  // Auto-speak new assistant messages when voice is enabled
  useEffect(() => {
    if (
      voiceEnabled &&
      !isUser &&
      isLatest &&
      message.content &&
      !hasSpokenRef.current
    ) {
      hasSpokenRef.current = true;
      speak(message.content);
    }
  }, [voiceEnabled, isUser, isLatest, message.content, speak]);

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(message.content);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-3 message-enter",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
        )}
      >
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "flex flex-col max-w-[80%] gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Image if present */}
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Uploaded homework"
            className="max-w-xs rounded-lg shadow-sm mb-2"
          />
        )}

        {/* Text bubble */}
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-[15px] leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card border border-border shadow-sm rounded-bl-md"
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Speak button for assistant messages */}
        {!isUser && message.content && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleSpeak}
            disabled={isLoading}
          >
            <Volume2 className={cn("h-4 w-4", (isSpeaking || isLoading) && "text-primary", isLoading && "animate-pulse")} />
            <span className="ml-1 text-xs">
              {isLoading ? "Loading..." : isSpeaking ? "Stop" : "Listen"}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
