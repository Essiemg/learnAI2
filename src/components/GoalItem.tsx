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
        "flex items-center gap-1 rounded-md border transition-all",
        compact 
          ? "p-1 bg-primary/10 border-primary/20 dark:bg-primary/20 dark:border-primary/30" 
          : "p-2 bg-card",
        isDragging && "opacity-50 scale-95",
        goal.is_completed && "opacity-60",
        compact ? "text-[10px]" : "text-sm"
      )}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {draggable && !compact && (
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      )}
      
      <Checkbox
        checked={goal.is_completed}
        onCheckedChange={() => onToggle(goal.id)}
        className={compact ? "h-3 w-3 shrink-0" : "h-4 w-4"}
      />
      
      <span
        className={cn(
          "flex-1 truncate leading-tight",
          goal.is_completed && "line-through text-muted-foreground",
          compact && "text-foreground font-medium"
        )}
      >
        {goal.title}
      </span>

      {!compact && (
        <div className="flex items-center gap-1">
          {onUnschedule && goal.target_date && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onUnschedule(goal.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDelete(goal.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
