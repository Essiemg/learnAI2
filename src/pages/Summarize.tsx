import { useState } from "react";
import { FileText, Upload, Loader2, Copy, Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useUploadedMaterials } from "@/hooks/useUploadedMaterials";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Summarize() {
  const { user } = useAuth();
  const { materials, isLoading: materialsLoading } = useUploadedMaterials();
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setSelectedMaterial(null);
    setCustomText("");
  };

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

    // Priority: uploaded file > selected material > custom text
    if (uploadedFile) {
      // Convert file to base64 for AI processing
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(uploadedFile);
      });
      const base64 = await base64Promise;
      contentToSummarize = base64;
    } else if (selectedMaterial) {
      const material = materials.find((m) => m.id === selectedMaterial);
      if (material?.extracted_text) {
        contentToSummarize = material.extracted_text;
      } else {
        toast({
          title: "No content",
          description: "This material has no extracted text",
          variant: "destructive",
        });
        return;
      }
    } else if (customText.trim()) {
      contentToSummarize = customText.trim();
    } else {
      toast({
        title: "No content",
        description: "Please upload a file, select a material, or enter text",
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
          isBase64: !!uploadedFile,
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
              Upload materials and get AI-powered summaries by signing in.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Summarize Materials
        </h1>
        <p className="text-muted-foreground">
          Upload any document or paste text to get an AI-generated summary
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Source Material</CardTitle>
            <CardDescription>
              Choose how to provide your content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload a file
              </label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  {uploadedFile ? (
                    <p className="text-sm font-medium">{uploadedFile.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Click to upload PDF, Word, or image files
                    </p>
                  )}
                </label>
              </div>
            </div>

            {/* Existing Materials */}
            {materials.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Or select from your materials
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {materials.map((material) => (
                    <button
                      key={material.id}
                      onClick={() => {
                        setSelectedMaterial(material.id);
                        setUploadedFile(null);
                        setCustomText("");
                      }}
                      className={cn(
                        "w-full p-2 rounded-lg border text-left text-sm transition-colors",
                        selectedMaterial === material.id
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted"
                      )}
                    >
                      {material.file_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Text */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Or paste text directly
              </label>
              <Textarea
                placeholder="Paste your text here..."
                value={customText}
                onChange={(e) => {
                  setCustomText(e.target.value);
                  setSelectedMaterial(null);
                  setUploadedFile(null);
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

        {/* Output Section */}
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
