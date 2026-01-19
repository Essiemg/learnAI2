import { useRef, useEffect } from "react";
import { Message } from "@/types/chat";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { BookOpen, Sparkles } from "lucide-react";

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  userName: string;
}

const welcomeMessages = [
  "Hi there! 👋 I'm StudyBuddy, your learning companion!",
  "Upload a picture of your homework or type your question.",
  "Remember: I'm here to help you think, not to give you answers! 🧠",
];

const subjectSuggestions = [
  { icon: "📐", label: "Math", prompt: "I need help with a math problem" },
  { icon: "📚", label: "Reading", prompt: "Can you help me understand this text?" },
  { icon: "🔬", label: "Science", prompt: "I have a science question" },
  { icon: "✍️", label: "Writing", prompt: "Can you help me with my essay?" },
];

export function ChatContainer({ messages, isLoading, userName }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const isEmpty = messages.length === 0;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
          {/* Welcome illustration */}
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <BookOpen className="h-12 w-12 text-primary-foreground" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-warning flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-warning-foreground" />
            </div>
          </div>

          {/* Welcome text */}
          <h2 className="text-2xl font-bold mb-2">
            {userName ? `Hey ${userName}! 👋` : "Hey there! 👋"}
          </h2>
          <div className="space-y-1 text-muted-foreground max-w-md">
            {welcomeMessages.map((msg, i) => (
              <p key={i} className="text-sm">{msg}</p>
            ))}
          </div>

          {/* Subject suggestions */}
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-xs w-full">
            {subjectSuggestions.map((subject) => (
              <button
                key={subject.label}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary hover:shadow-sm transition-all text-left card-interactive"
              >
                <span className="text-xl">{subject.icon}</span>
                <span className="text-sm font-medium">{subject.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLatest={index === messages.length - 1 && message.role === "assistant"}
            />
          ))}
          {isLoading && <TypingIndicator />}
        </>
      )}
      <div ref={endRef} />
    </div>
  );
}
