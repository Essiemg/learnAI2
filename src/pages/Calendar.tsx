import { useState, useEffect } from "react";
import { CalendarDays, Flame, Trophy, TrendingUp, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGoals } from "@/hooks/useGoals";
import { GoalItem } from "@/components/GoalItem";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const {
    unscheduledGoals,
    scheduledGoals,
    loading,
    addGoal,
    deleteGoal,
    toggleComplete,
    assignToDate,
  } = useGoals();

  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
    activeDays: [],
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

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

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push({ date: "", hasActivity: false });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        date: dateStr,
        hasActivity: streakData.activeDays.includes(dateStr),
      });
    }

    return days;
  };

  const getGoalsForDate = (dateStr: string) => {
    return scheduledGoals.filter((g) => g.target_date === dateStr);
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    await addGoal(newGoalTitle.trim());
    setNewGoalTitle("");
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const goalId = e.dataTransfer.getData("goalId");
    if (goalId) {
      await assignToDate(goalId, dateStr);
    }
    setDragOverDate(null);
  };

  const handleUnschedule = async (goalId: string) => {
    await assignToDate(goalId, null);
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

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign in to use the Calendar</h2>
            <p className="text-muted-foreground">
              Track your goals and study streaks by signing in to your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarDays className="h-8 w-8 text-primary" />
          Study Calendar
        </h1>
        <p className="text-muted-foreground">
          Plan your goals, track your streaks, and stay consistent
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Goals Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>My Goals</CardTitle>
            <CardDescription>Drag goals to calendar dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddGoal} className="flex gap-2">
              <Input
                placeholder="Add a new goal..."
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Loading goals...
                </p>
              ) : unscheduledGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No unscheduled goals. Add one above!
                </p>
              ) : (
                unscheduledGoals.map((goal) => (
                  <GoalItem
                    key={goal.id}
                    goal={goal}
                    onToggle={toggleComplete}
                    onDelete={deleteGoal}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="lg:col-span-2">
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
            <CardDescription>Drop goals on dates to schedule them</CardDescription>
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
              {monthDays.map((day, idx) => {
                const dayGoals = day.date ? getGoalsForDate(day.date) : [];
                const isDropTarget = dragOverDate === day.date;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[80px] p-1 rounded-md text-sm border transition-all",
                      !day.date && "invisible",
                      day.date === today && "ring-2 ring-primary",
                      day.hasActivity && "bg-primary/10",
                      isDropTarget && "bg-accent border-primary border-2"
                    )}
                    onDragOver={(e) => day.date && handleDragOver(e, day.date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => day.date && handleDrop(e, day.date)}
                  >
                    {day.date && (
                      <>
                        <div
                          className={cn(
                            "text-xs font-medium mb-1",
                            day.hasActivity && "text-primary"
                          )}
                        >
                          {new Date(day.date).getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayGoals.slice(0, 2).map((goal) => (
                            <GoalItem
                              key={goal.id}
                              goal={goal}
                              onToggle={toggleComplete}
                              onDelete={deleteGoal}
                              onUnschedule={handleUnschedule}
                              compact
                            />
                          ))}
                          {dayGoals.length > 2 && (
                            <p className="text-[10px] text-muted-foreground text-center">
                              +{dayGoals.length - 2} more
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
