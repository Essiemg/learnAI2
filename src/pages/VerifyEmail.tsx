import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  
  const email = location.state?.email || searchParams.get("email") || "";
  const token = searchParams.get("token");

  // Handle token verification if present in URL
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (verificationToken: string) => {
    setIsVerifying(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/auth/verify-email?token=${verificationToken}`);
      const data = await response.json();
      
      if (response.ok) {
        setIsVerified(true);
        toast.success("Email verified successfully! You can now sign in.");
      } else {
        setError(data.detail || "Verification failed. The link may have expired.");
      }
    } catch (err) {
      setError("Failed to verify email. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("No email address found. Please sign up again.");
      return;
    }
    
    setIsResending(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/resend-verification?email=${encodeURIComponent(email)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (response.ok) {
        toast.success("Verification email sent! Please check your inbox.");
      } else {
        const data = await response.json();
        toast.error(data.detail || "Failed to resend email");
      }
    } catch (err) {
      toast.error("Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  // Show verification result if token was in URL
  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-secondary/30 to-background">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {isVerifying ? (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : isVerified ? (
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl">
              {isVerifying ? "Verifying..." : isVerified ? "Email Verified!" : "Verification Failed"}
            </CardTitle>
            <CardDescription>
              {isVerifying
                ? "Please wait while we verify your email..."
                : isVerified
                ? "Your email has been verified successfully."
                : error || "The verification link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            {isVerified ? (
              <Button className="w-full" onClick={() => navigate("/login")}>
                Continue to Sign In
              </Button>
            ) : !isVerifying && (
              <>
                <Button className="w-full" onClick={handleResendEmail} disabled={isResending}>
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Resend Verification Email"
                  )}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => navigate("/signup")}>
                  Back to Sign Up
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show "check your email" page after signup
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-secondary/30 to-background">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to{" "}
            <span className="font-medium text-foreground">{email || "your email"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Next steps:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open the email from Toki</li>
              <li>Click the verification link</li>
              <li>Come back and sign in to start learning!</li>
            </ol>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Didn't receive the email? Check your spam folder or click below to resend.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleResendEmail}
            disabled={isResending || !email}
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Resend Verification Email"
            )}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate("/login")}>
            Back to Sign In
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
