import { useState, useEffect } from "react";
import { CalendarDays, Flame, Trophy, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DayData {
  date: string;
  hasActivity: boolean;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  activeDays: string[];
}

const STORAGE_KEY = "studybuddy_streaks";

export default function Calendar() {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
    activeDays: [],
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadStreakData();
    checkAndUpdateStreak();
  }, []);

  const loadStreakData = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setStreakData(JSON.parse(stored));
      } catch {}
    }
  };

  const checkAndUpdateStreak = () => {
    const today = new Date().toISOString().split("T")[0];
    const activity = localStorage.getItem("studybuddy_activity");
    
    if (activity) {
      const stored = localStorage.getItem(STORAGE_KEY);
      let data: StreakData = stored
        ? JSON.parse(stored)
        : { currentStreak: 0, longestStreak: 0, totalDays: 0, activeDays: [] };

      // Check if today already counted
      if (!data.activeDays.includes(today)) {
        const parsedActivity = JSON.parse(activity);
        const hasActivityToday =
          parsedActivity.tutorSessions > 0 ||
          parsedActivity.flashcardsStudied > 0 ||
          parsedActivity.quizzesCompleted > 0 ||
          parsedActivity.essaysSubmitted > 0;

        if (hasActivityToday) {
          data.activeDays.push(today);
          data.totalDays++;

          // Calculate current streak
          const sortedDays = [...data.activeDays].sort().reverse();
          let streak = 0;
          let checkDate = new Date(today);

          for (const day of sortedDays) {
            const dayDate = new Date(day);
            const diff = Math.floor(
              (checkDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (diff <= 1) {
              streak++;
              checkDate = dayDate;
            } else {
              break;
            }
          }

          data.currentStreak = streak;
          data.longestStreak = Math.max(data.longestStreak, streak);

          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          setStreakData(data);
        }
      }
    }
  };

  const getDaysInMonth = (date: Date): DayData[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: DayData[] = [];

    // Add empty days for alignment
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push({ date: "", hasActivity: false });
    }

    // Add actual days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        date: dateStr,
        hasActivity: streakData.activeDays.includes(dateStr),
      });
    }

    return days;
  };

  const monthDays = getDaysInMonth(currentMonth);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const navigateMonth = (delta: number) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + delta);
      return newDate;
    });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarDays className="h-8 w-8 text-primary" />
          Study Calendar
        </h1>
        <p className="text-muted-foreground">
          Track your learning streaks and stay consistent
        </p>
      </div>

      {/* Streak Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <div className="text-3xl font-bold">{streakData.currentStreak}</div>
            <p className="text-sm text-muted-foreground">Current Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <div className="text-3xl font-bold">{streakData.longestStreak}</div>
            <p className="text-sm text-muted-foreground">Longest Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-3xl font-bold">{streakData.totalDays}</div>
            <p className="text-sm text-muted-foreground">Total Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-muted rounded-md"
            >
              ←
            </button>
            <CardTitle>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </CardTitle>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-muted rounded-md"
            >
              →
            </button>
          </div>
          <CardDescription>Days with study activity are highlighted</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, idx) => (
              <div
                key={idx}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-md text-sm",
                  !day.date && "invisible",
                  day.date === today && "ring-2 ring-primary",
                  day.hasActivity
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted"
                )}
              >
                {day.date ? new Date(day.date).getDate() : ""}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Streak Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Keep Your Streak Going!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Complete at least one activity daily to maintain your streak</li>
            <li>• Study with the AI Tutor, practice flashcards, take quizzes, or submit essays</li>
            <li>• Consistency is more important than duration</li>
            <li>• Set a daily reminder to study</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
