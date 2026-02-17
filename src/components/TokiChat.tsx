import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { useEducationContext } from "@/contexts/EducationContext";
import { useChat } from "@/hooks/useChat";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useGeminiLive } from "@/hooks/useGeminiLive";
import { useLearningAnalytics } from "@/hooks/useLearningAnalytics";
import { Header } from "./Header";
import { ChatContainer } from "./ChatContainer";
import { ChatInput } from "./ChatInput";
import { HistoryPanel } from "./HistoryPanel";
import { LiveVoiceButton } from "./LiveVoiceButton";
import { toast } from "sonner";
import { useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Shield, LogIn } from "lucide-react";

export function TokiChat() {
  const { user, profile, role, isLoading: authLoading } = useAuth();
  const { gradeLevel, setGradeLevel } = useUser();
  const { userEducation, userSubjects } = useEducationContext();
  const navigate = useNavigate();

  // Learning analytics for adaptive tutoring
  const {
    trackInteraction,
    buildLearnerProfile,
    resetSessionStats,
  } = useLearningAnalytics();

  // Sync grade level from profile
  useEffect(() => {
    if (profile?.grade_level) {
      setGradeLevel(profile.grade_level);
    }
  }, [profile?.grade_level, setGradeLevel]);

  // Default to grade 5 if not set to prevent blocking input
  const effectiveGradeLevel = profile?.grade_level || gradeLevel || 5;

  // Build education context for personalized AI
  const subjectNames = userSubjects.map(s => s.name);

  // Build learner profile for adaptive responses
  const learnerProfile = buildLearnerProfile(
    userEducation?.education_level || "primary",
    userEducation?.field_of_study || undefined,
    subjectNames
  );

  // Handle interaction tracking
  const handleInteraction = useCallback((topic: string, message: string) => {
    trackInteraction(topic, message);
  }, [trackInteraction]);

  const {
    sessions,
    currentSessionId,
    saveSession,
    loadSession,
    deleteSession,
    startNewSession,
    addMessageToSession,
  } = useChatHistory();

  // Handle persistent message saving
  const handleMessageSent = useCallback(async (role: "user" | "assistant", content: string) => {
    // If no current session, create one
    let targetSessionId = currentSessionId;
    if (!targetSessionId) {
      const newSession = await saveSession([], "New Chat"); // Create empty session
      if (newSession) {
        targetSessionId = newSession;
      }
    }

    if (targetSessionId) {
      await addMessageToSession(targetSessionId, role, content);
    }
  }, [currentSessionId, saveSession, addMessageToSession]);

  const { messages, isLoading, error, sendMessage, clearMessages, setMessages } = useChat({
    gradeLevel: effectiveGradeLevel,
    educationLevel: userEducation?.education_level as any, // Cast to any to fix type mismatch for now
    fieldOfStudy: userEducation?.field_of_study,
    subjects: subjectNames,
    learnerProfile,
    userName: profile?.display_name,
    onInteraction: handleInteraction,
    onMessageSent: handleMessageSent,
  });



  // Live Lecture mode - handles voice transcription and AI responses
  const handleLiveLectureTranscript = useCallback(
    (text: string, isUser: boolean) => {
      if (!text.trim()) return;

      // Add the transcript/response to the chat messages for display
      const newMessage = {
        id: `live-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        role: isUser ? "user" as const : "assistant" as const,
        content: text,
        timestamp: new Date(),
      };

      // Update messages state to show in chat
      if (setMessages) {
        setMessages((prev) => [...prev, newMessage]);
      }

      // Also persist live transcriptions
      handleMessageSent(isUser ? "user" : "assistant", text);

      console.log(isUser ? "User said:" : "AI said:", text);
    },
    [setMessages, handleMessageSent]
  );

  const handleLiveLectureError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  const {
    isConnected: isLiveMode,
    isListening,
    isSpeaking,
    isProcessing,
    toggle: toggleLiveMode,
  } = useGeminiLive({
    gradeLevel: effectiveGradeLevel,
    educationLevel: userEducation?.education_level,
    fieldOfStudy: userEducation?.field_of_study,
    subjects: subjectNames,
    onTranscript: handleLiveLectureTranscript,
    onError: handleLiveLectureError,
  });

  // Load session messages when selected
  useEffect(() => {
    if (currentSessionId) {
      const loadedMessages = loadSession(currentSessionId);
      if (loadedMessages && setMessages) {
        setMessages(loadedMessages);
      }
    }
  }, [currentSessionId, loadSession, setMessages]);




  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSend = (message: string, imageData?: string, files?: { id: string; name: string; type: string; base64: string }[]) => {
    // Check for files - prioritize in order: explicit imageData, image files, then other files (like PDFs)
    let fileToSend = imageData;

    if (!fileToSend && files && files.length > 0) {
      // First check for images
      const imageFile = files.find(f => f.type.startsWith("image/"));
      if (imageFile) {
        fileToSend = imageFile.base64;
      } else {
        // Use the first file (could be PDF or other document)
        // For PDFs and documents, we'll send the base64 data
        fileToSend = files[0].base64;
      }
    }

    // Pass both legacy imageData (if any) and the full files array
    // The useChat hook handles merging them
    sendMessage(message, fileToSend, files?.map(f => ({ type: f.type, base64: f.base64 })));
  };

  const handleNewChat = () => {

    clearMessages();
    startNewSession();
    resetSessionStats(); // Reset learning analytics for new conversation
  };

  const handleSelectChat = (sessionId: string) => {
    const loadedMessages = loadSession(sessionId);
    if (loadedMessages && setMessages) {
      setMessages(loadedMessages);
      toast.success("Chat loaded");
    }
  };

  const handleDeleteChat = async (sessionId: string) => {
    const success = await deleteSession(sessionId);
    if (success) {
      toast.success("Chat deleted");
    }
  };

  const historyItems = sessions.map((s) => ({
    id: s.id,
    title: s.topic || s.messages[0]?.content.slice(0, 30) + "..." || "Chat",
    subtitle: `${s.messages.length} messages`,
    date: s.updated_at,
  }));

  // Show login prompt for non-authenticated users
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col h-screen max-h-screen bg-background">
        <Header onNewChat={handleNewChat} hasMessages={false} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">Welcome to Toki!</h2>
            <p className="text-muted-foreground mb-6">
              Sign in to start learning with your personal tutor.
            </p>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => navigate("/login")}>
                <LogIn className="mr-2 h-5 w-5" />
                Sign In
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate("/signup")}>
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard links for parents/admins
  if (role === "parent" || role === "admin") {
    return (
      <div className="flex flex-col h-screen max-h-screen bg-background">
        <Header onNewChat={handleNewChat} hasMessages={messages.length > 0} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md space-y-6">
            <h2 className="text-2xl font-bold">
              Welcome, {profile?.display_name}!
            </h2>
            <p className="text-muted-foreground">
              {role === "admin"
                ? "Manage users and monitor the platform."
                : "Monitor your children's learning progress."}
            </p>
            <div className="flex flex-col gap-3">
              {role === "parent" && (
                <Button size="lg" onClick={() => navigate("/parent")}>
                  <Users className="mr-2 h-5 w-5" />
                  Parent Dashboard
                </Button>
              )}
              {role === "admin" && (
                <Button size="lg" onClick={() => navigate("/admin")}>
                  <Shield className="mr-2 h-5 w-5" />
                  Admin Dashboard
                </Button>
              )}
              <Button variant="outline" size="lg" onClick={() => navigate("/profile")}>
                Manage Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter out legacy greeting messages
  const filteredMessages = messages.filter(m =>
    !m.content.includes("what do you want to learn about today?")
  );

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <div className="flex items-center justify-between border-b px-4">
        <Header onNewChat={handleNewChat} hasMessages={messages.length > 0} />
        <div className="flex items-center gap-2 py-2">
          <LiveVoiceButton
            isLive={isLiveMode}
            isListening={isListening}
            isSpeaking={isSpeaking}
            isProcessing={isProcessing}
            onToggle={toggleLiveMode}
            disabled={effectiveGradeLevel === 0}
          />
          <HistoryPanel
            chatSessions={historyItems}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            activeTab="chats"
          />
        </div>
      </div>

      <ChatContainer
        messages={filteredMessages}
        isLoading={isLoading}
        userName={profile?.display_name || ""}
        isLiveMode={isLiveMode}
        isListening={isListening}
        isSpeaking={isSpeaking}
      />
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        disabled={isLiveMode}
      />
    </div>
  );
}
