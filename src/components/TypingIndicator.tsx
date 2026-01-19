import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 message-enter">
      <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex items-center gap-1 px-4 py-3 bg-card border border-border rounded-2xl rounded-bl-md shadow-sm">
        <span className="w-2 h-2 bg-primary rounded-full thinking-pulse" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-primary rounded-full thinking-pulse" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-primary rounded-full thinking-pulse" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
