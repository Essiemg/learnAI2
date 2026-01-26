import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EDUCATION_LEVELS, type EducationLevel } from '@/types/education';
import { BookOpen, GraduationCap, School } from 'lucide-react';

const LEVEL_ICONS: Record<EducationLevel, React.ReactNode> = {
  primary: <School className="h-8 w-8" />,
  high_school: <BookOpen className="h-8 w-8" />,
  undergraduate: <GraduationCap className="h-8 w-8" />,
};

interface EducationLevelStepProps {
  userName: string;
  onSelect: (level: EducationLevel) => void;
}

export function EducationLevelStep({ userName, onSelect }: EducationLevelStepProps) {
  return (
    <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <GraduationCap className="h-8 w-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Welcome, {userName}! 🎉</CardTitle>
        <CardDescription className="text-base">
          Let's personalize your learning experience. What's your education level?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {EDUCATION_LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => onSelect(level.value)}
            className="w-full p-4 rounded-xl border-2 border-border bg-background hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left flex items-center gap-4 group"
          >
            <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              {LEVEL_ICONS[level.value]}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{level.label}</h3>
              <p className="text-sm text-muted-foreground">{level.description}</p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
