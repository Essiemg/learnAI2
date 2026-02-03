import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EDUCATION_LEVELS, type EducationLevel } from '@/types/education';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';

interface OnboardingCompleteProps {
  educationLevel: EducationLevel;
}

export function OnboardingComplete({ educationLevel }: OnboardingCompleteProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const levelLabel = EDUCATION_LEVELS.find(l => l.value === educationLevel)?.label;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const getMessage = () => {
    switch (educationLevel) {
      case 'primary':
        return "Get ready for fun learning adventures! 🚀";
      case 'high_school':
        return "Your personalized study tools are ready! 📚";
      case 'college':
        return "Advanced academic support awaits you! 🎓";
      default:
        return "Let's start learning together! 🌟";
    }
  };

  return (
    <Card className="border-0 shadow-xl bg-card/95 backdrop-blur text-center">
      <CardHeader className="pb-2">
        <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center animate-scale-in">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">You're all set! 🎉</CardTitle>
        <CardDescription className="text-base">
          Your {levelLabel} learning experience has been personalized
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
          <Sparkles className="h-6 w-6 mx-auto mb-2 text-primary" />
          <p className="font-medium text-lg">{getMessage()}</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => navigate('/dashboard')}
            size="lg"
            className="w-full"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-sm text-muted-foreground">
            Redirecting in {countdown} seconds...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
