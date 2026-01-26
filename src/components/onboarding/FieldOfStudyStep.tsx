import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FIELD_OF_STUDY_OPTIONS, EDUCATION_LEVELS, type EducationLevel } from '@/types/education';
import { ArrowLeft, Briefcase, FlaskConical, BookOpen, Heart, Scale, GraduationCap, Palette, Microscope, Users } from 'lucide-react';

const FIELD_ICONS: Record<string, React.ReactNode> = {
  'Sciences': <FlaskConical className="h-5 w-5" />,
  'Arts & Humanities': <Palette className="h-5 w-5" />,
  'Business Studies': <Briefcase className="h-5 w-5" />,
  'Technical/Vocational': <Briefcase className="h-5 w-5" />,
  'General Studies': <BookOpen className="h-5 w-5" />,
  'Computer Science & IT': <FlaskConical className="h-5 w-5" />,
  'Engineering': <Briefcase className="h-5 w-5" />,
  'Business & Management': <Briefcase className="h-5 w-5" />,
  'Health Sciences': <Heart className="h-5 w-5" />,
  'Education': <GraduationCap className="h-5 w-5" />,
  'Law': <Scale className="h-5 w-5" />,
  'Natural Sciences': <Microscope className="h-5 w-5" />,
  'Social Sciences': <Users className="h-5 w-5" />,
};

interface FieldOfStudyStepProps {
  educationLevel: EducationLevel;
  onSelect: (field: string) => void;
  onBack: () => void;
}

export function FieldOfStudyStep({ educationLevel, onSelect, onBack }: FieldOfStudyStepProps) {
  const fields = FIELD_OF_STUDY_OPTIONS[educationLevel];
  const levelLabel = EDUCATION_LEVELS.find(l => l.value === educationLevel)?.label;

  return (
    <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
      <CardHeader className="text-center pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="absolute left-4 top-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <CardTitle className="text-2xl pt-8">What's your focus area?</CardTitle>
        <CardDescription className="text-base">
          Select your curriculum track or field of study for {levelLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
        {fields.map((field) => (
          <button
            key={field}
            onClick={() => onSelect(field)}
            className="p-4 rounded-xl border-2 border-border bg-background hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left flex items-center gap-3 group"
          >
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              {FIELD_ICONS[field] || <BookOpen className="h-5 w-5" />}
            </div>
            <span className="font-medium">{field}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
