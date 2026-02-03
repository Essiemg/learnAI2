import { useRef, useEffect } from "react";
import { Message } from "@/types/chat";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { Radio, Mic, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  userName?: string;
  isLiveMode?: boolean;
  isListening?: boolean;
  isSpeaking?: boolean;
}

export function ChatContainer({ 
  messages, 
  isLoading, 
  isLiveMode = false,
  isListening = false,
  isSpeaking = false 
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
      {/* Live Lecture Mode Indicator */}
      {isLiveMode && (
        <div className="sticky top-0 z-10 flex justify-center mb-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg",
            "bg-gradient-to-r from-primary to-accent text-white",
            "animate-pulse"
          )}>
            <Radio className="h-4 w-4" />
            <span>Live Lecture Active</span>
            {isListening && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/30">
                <Mic className="h-3 w-3 animate-pulse" />
                <span className="text-xs">Listening...</span>
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/30">
                <Volume2 className="h-3 w-3 animate-pulse" />
                <span className="text-xs">Speaking...</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id}
          message={message}
          isLatest={index === messages.length - 1 && message.role === "assistant"}
        />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={endRef} />
    </div>
  );
}
