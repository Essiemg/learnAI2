import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { EDUCATION_LEVELS, type EducationLevel, type Subject } from '@/types/education';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';

interface SubjectSelectionStepProps {
  educationLevel: EducationLevel;
  subjects: Subject[];
  selectedSubjects: string[];
  onSubmit: (subjectIds: string[]) => void;
  onBack: () => void;
  isSaving: boolean;
}

export function SubjectSelectionStep({
  educationLevel,
  subjects,
  selectedSubjects: initialSelected,
  onSubmit,
  onBack,
  isSaving,
}: SubjectSelectionStepProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const levelLabel = EDUCATION_LEVELS.find(l => l.value === educationLevel)?.label;

  // Group subjects by category
  const categories = [...new Set(subjects.map(s => s.category))].filter(Boolean) as string[];

  const toggleSubject = (subjectId: string) => {
    setSelected(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return null;
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const minSubjects = educationLevel === 'primary' ? 2 : 3;

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
        <CardTitle className="text-2xl pt-8">Choose your subjects</CardTitle>
        <CardDescription className="text-base">
          Select at least {minSubjects} subjects you want to focus on for {levelLabel}
        </CardDescription>
        <Badge variant="secondary" className="mx-auto mt-2">
          {selected.length} selected
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6 pt-4 max-h-[50vh] overflow-y-auto">
        {categories.map(category => (
          <div key={category}>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              {category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subjects
                .filter(s => s.category === category)
                .map(subject => (
                  <label
                    key={subject.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selected.includes(subject.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={selected.includes(subject.id)}
                      onCheckedChange={() => toggleSubject(subject.id)}
                    />
                    <div className="flex items-center gap-2">
                      {getIcon(subject.icon)}
                      <span className="font-medium">{subject.name}</span>
                    </div>
                  </label>
                ))}
            </div>
          </div>
        ))}
      </CardContent>
      <div className="p-6 pt-4 border-t">
        <Button
          onClick={() => onSubmit(selected)}
          disabled={selected.length < minSubjects || isSaving}
          className="w-full"
          size="lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Complete Setup
            </>
          )}
        </Button>
        {selected.length < minSubjects && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            Select {minSubjects - selected.length} more subject{minSubjects - selected.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </Card>
  );
}
