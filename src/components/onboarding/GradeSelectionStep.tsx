import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PRIMARY_GRADES, HIGH_SCHOOL_GRADES, type EducationLevel } from '@/types/education';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface GradeSelectionStepProps {
  educationLevel: EducationLevel;
  onSelect: (grade: number) => void;
  onBack: () => void;
  isSaving?: boolean;
}

export function GradeSelectionStep({ educationLevel, onSelect, onBack, isSaving }: GradeSelectionStepProps) {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  
  const grades = educationLevel === 'primary' ? PRIMARY_GRADES : HIGH_SCHOOL_GRADES;
  const levelLabel = educationLevel === 'primary' ? 'Primary School' : 'High School';

  const handleSelect = (grade: number) => {
    setSelectedGrade(grade);
    onSelect(grade);
  };

  return (
    <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
      <CardHeader className="text-center pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="absolute left-4 top-4"
          disabled={isSaving}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <CardTitle className="text-2xl pt-8">What grade are you in?</CardTitle>
        <CardDescription className="text-base">
          Select your current grade level for {levelLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {isSaving && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Saving your preferences...</span>
          </div>
        )}
        {!isSaving && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {grades.map((grade) => (
              <button
                key={grade.value}
                onClick={() => handleSelect(grade.value)}
                disabled={selectedGrade !== null}
                className="p-4 rounded-xl border-2 border-border bg-background hover:border-primary hover:bg-primary/5 transition-all duration-200 text-center group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-2xl font-bold text-primary group-hover:scale-110 transition-transform">
                  {selectedGrade === grade.value ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  ) : (
                    grade.value
                  )}
                </div>
                <div className="text-sm font-medium mt-1">{grade.label}</div>
                <div className="text-xs text-muted-foreground">{grade.description}</div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
