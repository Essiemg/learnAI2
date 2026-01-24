import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_date: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGoals();
    } else {
      setGoals([]);
      setLoading(false);
    }
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      console.error("Error fetching goals:", error);
      toast({
        title: "Error",
        description: "Failed to load goals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async (title: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          user_id: user.id,
          title,
          target_date: null,
          is_completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      setGoals((prev) => [data, ...prev]);
      return data;
    } catch (error: any) {
      console.error("Error adding goal:", error);
      toast({
        title: "Error",
        description: "Failed to add goal",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("goals")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      setGoals((prev) =>
        prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal))
      );
      return true;
    } catch (error: any) {
      console.error("Error updating goal:", error);
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      setGoals((prev) => prev.filter((goal) => goal.id !== id));
      return true;
    } catch (error: any) {
      console.error("Error deleting goal:", error);
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleComplete = async (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return false;
    return updateGoal(id, { is_completed: !goal.is_completed });
  };

  const assignToDate = async (id: string, date: string | null) => {
    return updateGoal(id, { target_date: date });
  };

  const unscheduledGoals = goals.filter((g) => !g.target_date);
  const scheduledGoals = goals.filter((g) => g.target_date);

  return {
    goals,
    unscheduledGoals,
    scheduledGoals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleComplete,
    assignToDate,
    refetch: fetchGoals,
  };
}
