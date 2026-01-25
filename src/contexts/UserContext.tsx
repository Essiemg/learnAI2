import { createContext, useContext, useState, ReactNode } from "react";

interface UserContextType {
  gradeLevel: number;
  setGradeLevel: (grade: number) => void;
  userName: string;
  setUserName: (name: string) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  userRole: "child" | "parent";
  setUserRole: (role: "child" | "parent") => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [gradeLevel, setGradeLevel] = useState<number>(() => {
    // Migrate from old key if exists
    const oldStored = localStorage.getItem("studybuddy-grade");
    const stored = localStorage.getItem("toki-grade") || oldStored;
    if (oldStored && !localStorage.getItem("toki-grade")) {
      localStorage.setItem("toki-grade", oldStored);
      localStorage.removeItem("studybuddy-grade");
    }
    return stored ? parseInt(stored, 10) : 0;
  });

  const [userName, setUserName] = useState<string>(() => {
    const oldStored = localStorage.getItem("studybuddy-name");
    const stored = localStorage.getItem("toki-name") || oldStored;
    if (oldStored && !localStorage.getItem("toki-name")) {
      localStorage.setItem("toki-name", oldStored);
      localStorage.removeItem("studybuddy-name");
    }
    return stored || "";
  });

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const oldStored = localStorage.getItem("studybuddy-voice");
    const stored = localStorage.getItem("toki-voice") || oldStored;
    if (oldStored && !localStorage.getItem("toki-voice")) {
      localStorage.setItem("toki-voice", oldStored);
      localStorage.removeItem("studybuddy-voice");
    }
    return stored === "true";
  });
  const [userRole, setUserRole] = useState<"child" | "parent">("child");

  const handleSetGradeLevel = (grade: number) => {
    setGradeLevel(grade);
    localStorage.setItem("toki-grade", grade.toString());
  };

  const handleSetUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem("toki-name", name);
  };

  const handleSetVoiceEnabled = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    localStorage.setItem("toki-voice", enabled.toString());
  };

  return (
    <UserContext.Provider
      value={{
        gradeLevel,
        setGradeLevel: handleSetGradeLevel,
        userName,
        setUserName: handleSetUserName,
        voiceEnabled,
        setVoiceEnabled: handleSetVoiceEnabled,
        userRole,
        setUserRole,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
