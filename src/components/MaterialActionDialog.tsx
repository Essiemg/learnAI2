import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Brain,
  FileText,
  GitBranch,
  MessageCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Material {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  source_url?: string | null;
}

interface MaterialActionDialogProps {
  material: Material | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ActionType = "flashcards" | "quizzes" | "summarize" | "diagrams" | "tutor";

const actions: { id: ActionType; label: string; icon: typeof BookOpen; description: string }[] = [
  {
    id: "flashcards",
    label: "Create Flashcards",
    icon: BookOpen,
    description: "Generate study flashcards from this material",
  },
  {
    id: "quizzes",
    label: "Create Quiz",
    icon: Brain,
    description: "Generate a quiz to test your knowledge",
  },
  {
    id: "summarize",
    label: "Summarize",
    icon: FileText,
    description: "Create a concise summary of the content",
  },
  {
    id: "diagrams",
    label: "Create Diagram",
    icon: GitBranch,
    description: "Visualize concepts with a diagram",
  },
  {
    id: "tutor",
    label: "Chat with Toki",
    icon: MessageCircle,
    description: "Discuss this material with your AI tutor",
  },
];

export function MaterialActionDialog({
  material,
  open,
  onOpenChange,
}: MaterialActionDialogProps) {
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleActionSelect = (action: ActionType) => {
    setSelectedAction(action);
  };

  const handleConfirm = () => {
    if (!selectedAction || !material) return;
    
    setIsNavigating(true);
    
    // Store the selected material info in sessionStorage for the target page to use
    sessionStorage.setItem(
      "toki_selected_material",
      JSON.stringify({
        id: material.id,
        name: material.file_name,
        type: material.file_type,
        path: material.file_path,
        sourceUrl: material.source_url,
      })
    );

    // Navigate to the appropriate page
    navigate(`/${selectedAction}`);
    onOpenChange(false);
    setSelectedAction(null);
    setIsNavigating(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedAction(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What would you like to do?</DialogTitle>
          <DialogDescription className="truncate">
            {material?.file_name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {actions.map((action) => {
            const Icon = action.icon;
            const isSelected = selectedAction === action.id;

            return (
              <button
                key={action.id}
                onClick={() => handleActionSelect(action.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedAction || isNavigating}>
            {isNavigating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
