import { useState } from "react";
import { FileText, Loader2, Copy, Check, Sparkles, FolderOpen, History, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialSelector } from "@/components/MaterialSelector";
import { summaryApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useSummaryHistory } from "@/hooks/useSummaryHistory";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface SelectedMaterial {
  id: string;
  name: string;
  type: string;
  base64: string;
}

export default function Summarize() {
  const { user } = useAuth();
  const { summaries, saveSummary, deleteSummary, loadSummaries, isLoading: historyLoading } = useSummaryHistory();
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [customText, setCustomText] = useState("");
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");

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
    let title = "";

    if (selectedMaterials.length > 0) {
      contentToSummarize = selectedMaterials[0].base64;
      isBase64 = true;
      title = selectedMaterials[0].name;
    } else if (customText.trim()) {
      contentToSummarize = customText.trim();
      title = customText.slice(0, 50) + (customText.length > 50 ? "..." : "");
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
    setCurrentTitle(title);

    try {
      // Prepare attachments if selected
      let attachments = undefined;
      if (selectedMaterials.length > 0) {
        attachments = selectedMaterials.map(m => ({
          type: m.type || "application/octet-stream", // Fallback mime
          content: m.base64
        }));
      }

      const result = await summaryApi.generate(contentToSummarize, isBase64, attachments);

      if (result?.summary) {
        setSummary(result.summary);
        // Summary is auto-saved by backend, just reload list
        await loadSummaries();
        toast({ title: "Summary generated and saved!" });
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

  const loadSavedSummary = (savedSummary: typeof summaries[0]) => {
    setSummary(savedSummary.summary);
    setCurrentTitle(savedSummary.title || "Saved Summary");
    if (savedSummary.source_text) {
      setCustomText(savedSummary.source_text);
    }
    setShowHistory(false);
    toast({ title: "Summary loaded" });
  };

  const handleDeleteSummary = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await deleteSummary(id);
    if (success) {
      toast({ title: "Summary deleted" });
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Summarize Materials
          </h1>
          <p className="text-muted-foreground">
            Select materials from your Study Sets or paste text to get an AI-generated summary
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          History ({summaries.length})
        </Button>
      </div>

      {showHistory && summaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved Summaries</CardTitle>
            <CardDescription>Click to view a previous summary</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {summaries.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => loadSavedSummary(s)}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.title || "Untitled Summary"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteSummary(s.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

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
                Or upload a file (Image/PDF)
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('summary-file-upload')?.click()}
                  className="w-full"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {selectedMaterials.length > 0 && selectedMaterials[0].type !== 'study_set' ? selectedMaterials[0].name : "Upload File"}
                </Button>
                <input
                  id="summary-file-upload"
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = reader.result as string;
                        setSelectedMaterials([{
                          id: 'upload',
                          name: file.name,
                          type: file.type,
                          base64: base64
                        }]);
                        setCustomText(""); // Clear text if file selected
                        toast({ title: "File attached" });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground my-2">- OR -</div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Paste text directly
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
                <CardTitle>{currentTitle || "Summary"}</CardTitle>
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
