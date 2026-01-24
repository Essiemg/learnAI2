import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Goal } from "@/hooks/useGoals";

interface GoalItemProps {
  goal: Goal;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUnschedule?: (id: string) => void;
  draggable?: boolean;
  compact?: boolean;
}

export function GoalItem({
  goal,
  onToggle,
  onDelete,
  onUnschedule,
  draggable = true,
  compact = false,
}: GoalItemProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("goalId", goal.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border bg-card transition-all",
        isDragging && "opacity-50 scale-95",
        goal.is_completed && "opacity-60",
        compact ? "text-xs" : "text-sm"
      )}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {draggable && (
        <GripVertical className={cn("text-muted-foreground cursor-grab", compact ? "h-3 w-3" : "h-4 w-4")} />
      )}
      
      <Checkbox
        checked={goal.is_completed}
        onCheckedChange={() => onToggle(goal.id)}
        className={compact ? "h-3 w-3" : "h-4 w-4"}
      />
      
      <span
        className={cn(
          "flex-1 truncate",
          goal.is_completed && "line-through text-muted-foreground"
        )}
      >
        {goal.title}
      </span>

      <div className="flex items-center gap-1">
        {onUnschedule && goal.target_date && (
          <Button
            variant="ghost"
            size="icon"
            className={compact ? "h-5 w-5" : "h-6 w-6"}
            onClick={() => onUnschedule(goal.id)}
          >
            <X className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("text-destructive hover:text-destructive", compact ? "h-5 w-5" : "h-6 w-6")}
          onClick={() => onDelete(goal.id)}
        >
          <Trash2 className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
        </Button>
      </div>
    </div>
  );
}
