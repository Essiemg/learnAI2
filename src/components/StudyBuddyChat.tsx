import { useUser } from "@/contexts/UserContext";
import { useChat } from "@/hooks/useChat";
import { Header } from "./Header";
import { ChatContainer } from "./ChatContainer";
import { ChatInput } from "./ChatInput";
import { toast } from "sonner";
import { useEffect } from "react";

export function StudyBuddyChat() {
  const { gradeLevel, userName } = useUser();
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat(gradeLevel);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSend = (message: string, imageData?: string) => {
    if (gradeLevel === 0) {
      toast.info("Please select your grade level first! 🎓");
      return;
    }
    sendMessage(message, imageData);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <Header onNewChat={clearMessages} hasMessages={messages.length > 0} />
      <ChatContainer messages={messages} isLoading={isLoading} userName={userName} />
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        disabled={gradeLevel === 0}
      />
    </div>
  );
}
