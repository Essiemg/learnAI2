import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LinkCodeGeneratorProps {
  linkCode: string | null;
  isGenerating: boolean;
  onGenerate: () => Promise<string | null>;
}

export function LinkCodeGenerator({ linkCode, isGenerating, onGenerate }: LinkCodeGeneratorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!linkCode) return;
    
    await navigator.clipboard.writeText(linkCode);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    const code = await onGenerate();
    if (code) {
      toast.success("Link code generated!");
    } else {
      toast.error("Failed to generate code");
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5 text-primary" />
          Link Your Child
        </CardTitle>
        <CardDescription>
          Generate a code for your child to connect their account. They'll enter this in their profile settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {linkCode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-background border border-border rounded-lg p-4 text-center">
                <span className="text-3xl font-mono font-bold tracking-[0.5em] text-primary">
                  {linkCode}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="h-14 w-14"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-success" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              This code expires in 24 hours and can only be used once.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Generate New Code
            </Button>
          </div>
        ) : (
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Generate Link Code
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
