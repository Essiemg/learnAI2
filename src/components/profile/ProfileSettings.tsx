import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileSettingsProps {
  displayName: string;
  gradeLevel: string;
  role: string | null;
  onDisplayNameChange: (name: string) => void;
  onGradeLevelChange: (grade: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export function ProfileSettings({
  displayName,
  gradeLevel,
  role,
  onDisplayNameChange,
  onGradeLevelChange,
  onSave,
  isSaving,
}: ProfileSettingsProps) {
  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    await onSave();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {role === "child" && (
            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Select value={gradeLevel} onValueChange={onGradeLevelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((grade) => (
                    <SelectItem key={grade} value={grade.toString()}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full" disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </div>
  );
}
