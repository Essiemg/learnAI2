import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Loader2, CheckCircle, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface LinkToParentProps {
  isLinked: boolean;
  onLinkSuccess: () => void;
}

export function LinkToParent({ isLinked, onLinkSuccess }: LinkToParentProps) {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const handleLink = async () => {
    if (code.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setIsLinking(true);

    try {
      const { data, error } = await supabase.rpc("link_child_to_parent", {
        link_code: code
      });

      if (error) {
        if (error.message.includes("primary")) {
          toast.error("Only primary school students can link to parents");
        } else if (error.message.includes("Invalid") || error.message.includes("expired")) {
          toast.error("Invalid or expired code. Please ask your parent for a new one.");
        } else {
          toast.error("Failed to link account");
        }
        return;
      }

      toast.success("Successfully linked to parent! 🎉");
      await refreshProfile();
      onLinkSuccess();
    } catch (error) {
      console.error("Error linking to parent:", error);
      toast.error("Failed to link account");
    } finally {
      setIsLinking(false);
      setCode("");
    }
  };

  if (isLinked) {
    return (
      <Card className="border-success/20 bg-success/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-success" />
            <div>
              <p className="font-medium">Linked to Parent</p>
              <p className="text-sm text-muted-foreground">
                Your parent can view your learning progress
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Link to Parent
        </CardTitle>
        <CardDescription>
          Enter the 6-digit code from your parent to let them view your learning progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="parentCode">Parent Code</Label>
          <Input
            id="parentCode"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-2xl font-mono tracking-[0.3em]"
          />
        </div>
        <Button 
          onClick={handleLink} 
          disabled={code.length !== 6 || isLinking}
          className="w-full"
        >
          {isLinking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Linking...
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 mr-2" />
              Link Account
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
