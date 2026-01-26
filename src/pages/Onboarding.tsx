import { useAuth } from '@/contexts/AuthContext';
import { useEducationContext } from '@/contexts/EducationContext';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function Onboarding() {
  const { user, isLoading: authLoading } = useAuth();
  const { needsOnboarding, isLoading: eduLoading } = useEducationContext();

  if (authLoading || eduLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in - go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Already completed onboarding - go to dashboard
  if (!needsOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return <OnboardingFlow />;
}
