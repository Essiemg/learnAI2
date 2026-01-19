import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface Topic {
  id: string;
  name: string;
  subject?: string;
  isCustom: boolean;
  createdAt: Date;
}

interface TopicContextType {
  topics: Topic[];
  currentTopic: Topic | null;
  recentTopics: Topic[];
  addTopic: (name: string, subject?: string) => Topic;
  setCurrentTopic: (topic: Topic | null) => void;
  removeTopic: (id: string) => void;
  getTopicSuggestions: (query: string) => Topic[];
}

const TopicContext = createContext<TopicContextType | undefined>(undefined);

const STORAGE_KEY = "studybuddy_topics";
const MAX_RECENT_TOPICS = 10;

// Pre-defined common topics
const DEFAULT_TOPICS: Omit<Topic, "createdAt">[] = [
  { id: "math-algebra", name: "Algebra", subject: "Mathematics", isCustom: false },
  { id: "math-geometry", name: "Geometry", subject: "Mathematics", isCustom: false },
  { id: "math-calculus", name: "Calculus", subject: "Mathematics", isCustom: false },
  { id: "science-physics", name: "Physics", subject: "Science", isCustom: false },
  { id: "science-chemistry", name: "Chemistry", subject: "Science", isCustom: false },
  { id: "science-biology", name: "Biology", subject: "Science", isCustom: false },
  { id: "english-grammar", name: "Grammar", subject: "English", isCustom: false },
  { id: "english-writing", name: "Creative Writing", subject: "English", isCustom: false },
  { id: "english-literature", name: "Literature", subject: "English", isCustom: false },
  { id: "history-world", name: "World History", subject: "History", isCustom: false },
  { id: "history-us", name: "US History", subject: "History", isCustom: false },
  { id: "geography", name: "Geography", subject: "Social Studies", isCustom: false },
  { id: "computer-science", name: "Computer Science", subject: "Technology", isCustom: false },
  { id: "art", name: "Art & Design", subject: "Arts", isCustom: false },
  { id: "music", name: "Music Theory", subject: "Arts", isCustom: false },
];

export function TopicProvider({ children }: { children: React.ReactNode }) {
  const [topics, setTopics] = useState<Topic[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) }));
      } catch {
        return DEFAULT_TOPICS.map((t) => ({ ...t, createdAt: new Date() }));
      }
    }
    return DEFAULT_TOPICS.map((t) => ({ ...t, createdAt: new Date() }));
  });

  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [recentTopics, setRecentTopics] = useState<Topic[]>([]);

  // Persist topics to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
  }, [topics]);

  // Track recent topics
  useEffect(() => {
    if (currentTopic) {
      setRecentTopics((prev) => {
        const filtered = prev.filter((t) => t.id !== currentTopic.id);
        return [currentTopic, ...filtered].slice(0, MAX_RECENT_TOPICS);
      });
    }
  }, [currentTopic]);

  const addTopic = useCallback((name: string, subject?: string): Topic => {
    const existingTopic = topics.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    if (existingTopic) {
      return existingTopic;
    }

    const newTopic: Topic = {
      id: `custom-${Date.now()}`,
      name,
      subject: subject || "Custom",
      isCustom: true,
      createdAt: new Date(),
    };

    setTopics((prev) => [...prev, newTopic]);
    return newTopic;
  }, [topics]);

  const removeTopic = useCallback((id: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== id || !t.isCustom));
    if (currentTopic?.id === id) {
      setCurrentTopic(null);
    }
  }, [currentTopic]);

  const getTopicSuggestions = useCallback(
    (query: string): Topic[] => {
      const lowerQuery = query.toLowerCase();
      return topics
        .filter(
          (t) =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.subject?.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 8);
    },
    [topics]
  );

  return (
    <TopicContext.Provider
      value={{
        topics,
        currentTopic,
        recentTopics,
        addTopic,
        setCurrentTopic,
        removeTopic,
        getTopicSuggestions,
      }}
    >
      {children}
    </TopicContext.Provider>
  );
}

export function useTopic() {
  const context = useContext(TopicContext);
  if (!context) {
    throw new Error("useTopic must be used within a TopicProvider");
  }
  return context;
}
