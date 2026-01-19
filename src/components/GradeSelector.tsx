import { useUser } from "@/contexts/UserContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const grades = [
  { value: "1", label: "Grade 1", emoji: "🌱" },
  { value: "2", label: "Grade 2", emoji: "🌿" },
  { value: "3", label: "Grade 3", emoji: "🌳" },
  { value: "4", label: "Grade 4", emoji: "⭐" },
  { value: "5", label: "Grade 5", emoji: "🌟" },
  { value: "6", label: "Grade 6", emoji: "🚀" },
  { value: "7", label: "Grade 7", emoji: "💫" },
  { value: "8", label: "Grade 8", emoji: "🎓" },
];

export function GradeSelector() {
  const { gradeLevel, setGradeLevel } = useUser();

  return (
    <Select
      value={gradeLevel > 0 ? gradeLevel.toString() : undefined}
      onValueChange={(value) => setGradeLevel(parseInt(value, 10))}
    >
      <SelectTrigger className="w-36 rounded-full bg-secondary/50">
        <SelectValue placeholder="Grade level" />
      </SelectTrigger>
      <SelectContent>
        {grades.map((grade) => (
          <SelectItem key={grade.value} value={grade.value}>
            <span className="flex items-center gap-2">
              <span>{grade.emoji}</span>
              <span>{grade.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
