import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Bot, User, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeech } from "@/hooks/useSpeech";
import { useUser } from "@/contexts/UserContext";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar with glow effect */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            "absolute inset-0 rounded-full blur-md opacity-40",
            isUser ? "bg-primary" : "bg-violet-500"
          )}
        />
        <div
          className={cn(
            "relative w-10 h-10 rounded-full flex items-center justify-center border-2 border-background",
            isUser 
              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" 
              : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
          )}
        >
          {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        </div>
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
            className="max-w-xs rounded-xl shadow-soft mb-2"
          />
        )}

        {/* Text bubble with enhanced styling */}
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-soft",
            isUser
              ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border/50 rounded-tl-sm backdrop-blur-sm"
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground px-1">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Speak button for assistant messages */}
        {!isUser && message.content && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
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
    </motion.div>
  );
}
