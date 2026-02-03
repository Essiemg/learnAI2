import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COLLEGE_YEARS, COLLEGE_MAJORS } from '@/types/education';
import { ArrowLeft, Loader2, GraduationCap } from 'lucide-react';

interface CollegeDetailsStepProps {
  onSubmit: (year: number, major: string) => void;
  onBack: () => void;
  isSaving?: boolean;
}

export function CollegeDetailsStep({ onSubmit, onBack, isSaving }: CollegeDetailsStepProps) {
  const [year, setYear] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  const [customMajor, setCustomMajor] = useState<string>('');

  const handleSubmit = () => {
    const selectedMajor = major === 'Other' ? customMajor : major;
    if (year && selectedMajor) {
      onSubmit(parseInt(year), selectedMajor);
    }
  };

  const isValid = year && (major !== 'Other' ? major : customMajor);

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
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <GraduationCap className="h-8 w-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Tell us about your studies</CardTitle>
        <CardDescription className="text-base">
          Help us personalize your learning experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {isSaving ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Saving your preferences...</span>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="year">What year are you in?</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year" className="w-full">
                  <SelectValue placeholder="Select your year" />
                </SelectTrigger>
                <SelectContent>
                  {COLLEGE_YEARS.map((y) => (
                    <SelectItem key={y.value} value={y.value.toString()}>
                      {y.label} - {y.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="major">What are you majoring in?</Label>
              <Select value={major} onValueChange={setMajor}>
                <SelectTrigger id="major" className="w-full">
                  <SelectValue placeholder="Select your major/course" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {COLLEGE_MAJORS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {major === 'Other' && (
              <div className="space-y-2">
                <Label htmlFor="customMajor">Enter your major/course</Label>
                <Input
                  id="customMajor"
                  placeholder="e.g., Marine Biology"
                  value={customMajor}
                  onChange={(e) => setCustomMajor(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSaving}
              className="w-full"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
