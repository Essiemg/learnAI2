import { useState } from "react";
import { FileText, Loader2, Copy, Check, Sparkles, FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialSelector } from "@/components/MaterialSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

interface SelectedMaterial {
  id: string;
  name: string;
  type: string;
  base64: string;
}

export default function Summarize() {
  const { user } = useAuth();
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [showMaterials, setShowMaterials] = useState(false);
  const [customText, setCustomText] = useState("");
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateSummary = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate summaries",
        variant: "destructive",
      });
      return;
    }

    let contentToSummarize = "";
    let isBase64 = false;

    if (selectedMaterials.length > 0) {
      contentToSummarize = selectedMaterials[0].base64;
      isBase64 = true;
    } else if (customText.trim()) {
      contentToSummarize = customText.trim();
    } else {
      toast({
        title: "No content",
        description: "Please select a material or enter text",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setSummary("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          type: "summary",
          content: contentToSummarize,
          isBase64,
        },
      });

      if (error) throw error;

      if (data?.summary) {
        setSummary(data.summary);
      } else {
        throw new Error("No summary generated");
      }
    } catch (error: any) {
      console.error("Summary error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign in to Summarize</h2>
            <p className="text-muted-foreground">
              Select materials from your Study Sets and get AI-powered summaries by signing in.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Summarize Materials
        </h1>
        <p className="text-muted-foreground">
          Select materials from your Study Sets or paste text to get an AI-generated summary
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Source Material</CardTitle>
            <CardDescription>
              Choose how to provide your content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button
                variant="outline"
                onClick={() => setShowMaterials(!showMaterials)}
                className="w-full justify-start gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                {selectedMaterials.length > 0 ? selectedMaterials[0].name : "Select from Study Sets"}
              </Button>

              <Collapsible open={showMaterials}>
                <CollapsibleContent className="pt-4">
                  <MaterialSelector
                    selectedIds={selectedMaterials.map((m) => m.id)}
                    onSelect={(materials) => {
                      setSelectedMaterials(materials);
                      if (materials.length > 0) {
                        setCustomText("");
                      }
                    }}
                    maxSelection={1}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Or paste text directly
              </label>
              <Textarea
                placeholder="Paste your text here..."
                value={customText}
                onChange={(e) => {
                  setCustomText(e.target.value);
                  if (e.target.value) {
                    setSelectedMaterials([]);
                  }
                }}
                rows={6}
              />
            </div>

            <Button
              onClick={generateSummary}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Summary</CardTitle>
                <CardDescription>
                  AI-generated summary of your content
                </CardDescription>
              </div>
              {summary && (
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isGenerating ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : summary ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap">{summary}</div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your summary will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
