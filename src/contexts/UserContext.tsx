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
    const stored = localStorage.getItem("studybuddy-grade");
    return stored ? parseInt(stored, 10) : 0;
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("studybuddy-name") || "";
  });

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    return localStorage.getItem("studybuddy-voice") === "true";
  });

  const [userRole, setUserRole] = useState<"child" | "parent">("child");

  const handleSetGradeLevel = (grade: number) => {
    setGradeLevel(grade);
    localStorage.setItem("studybuddy-grade", grade.toString());
  };

  const handleSetUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem("studybuddy-name", name);
  };

  const handleSetVoiceEnabled = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    localStorage.setItem("studybuddy-voice", enabled.toString());
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
