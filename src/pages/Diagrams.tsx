import { useState, useEffect } from "react";
import { GitBranch, Loader2, Copy, Check, Sparkles, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useUploadedMaterials } from "@/hooks/useUploadedMaterials";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import mermaid from "mermaid";

export default function Diagrams() {
  const { user } = useAuth();
  const { materials } = useUploadedMaterials();
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [mermaidCode, setMermaidCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diagramType, setDiagramType] = useState<"flowchart" | "mindmap">("flowchart");
  const [renderedSvg, setRenderedSvg] = useState("");

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
    });
  }, []);

  useEffect(() => {
    if (mermaidCode) {
      renderDiagram();
    }
  }, [mermaidCode]);

  const renderDiagram = async () => {
    try {
      const { svg } = await mermaid.render(`mermaid-${Date.now()}`, mermaidCode);
      setRenderedSvg(svg);
    } catch (err: any) {
      console.error("Mermaid render error:", err);
      setRenderedSvg("");
      toast({
        title: "Render Error",
        description: "Could not render the diagram. Trying to fix...",
        variant: "destructive",
      });
    }
  };

  const generateDiagram = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate diagrams",
        variant: "destructive",
      });
      return;
    }

    let contentToVisualize = "";

    if (selectedMaterial) {
      const material = materials.find((m) => m.id === selectedMaterial);
      if (material?.extracted_text) {
        contentToVisualize = material.extracted_text;
      } else {
        toast({
          title: "No content",
          description: "This material has no extracted text",
          variant: "destructive",
        });
        return;
      }
    } else if (customText.trim()) {
      contentToVisualize = customText.trim();
    } else {
      toast({
        title: "No content",
        description: "Please select a material or enter text",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setMermaidCode("");
    setRenderedSvg("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          type: "diagram",
          diagramType,
          content: contentToVisualize,
        },
      });

      if (error) throw error;

      if (data?.mermaidCode) {
        setMermaidCode(data.mermaidCode);
      } else {
        throw new Error("No diagram generated");
      }
    } catch (error: any) {
      console.error("Diagram error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate diagram",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const downloadSvg = () => {
    if (renderedSvg) {
      const blob = new Blob([renderedSvg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diagram-${diagramType}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign in to Generate Diagrams</h2>
            <p className="text-muted-foreground">
              Create visual diagrams from your study materials.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GitBranch className="h-8 w-8 text-primary" />
          Diagram Generator
        </h1>
        <p className="text-muted-foreground">
          Create flowcharts and mind maps from your study materials
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Source Material</CardTitle>
            <CardDescription>
              Provide content to visualize as a diagram
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Diagram Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Diagram Type
              </label>
              <div className="flex gap-2">
                <Button
                  variant={diagramType === "flowchart" ? "default" : "outline"}
                  onClick={() => setDiagramType("flowchart")}
                  className="flex-1"
                >
                  Flowchart
                </Button>
                <Button
                  variant={diagramType === "mindmap" ? "default" : "outline"}
                  onClick={() => setDiagramType("mindmap")}
                  className="flex-1"
                >
                  Mind Map
                </Button>
              </div>
            </div>

            {/* Existing Materials */}
            {materials.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select from your materials
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {materials.map((material) => (
                    <button
                      key={material.id}
                      onClick={() => {
                        setSelectedMaterial(material.id);
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
                Or enter text directly
              </label>
              <Textarea
                placeholder="Enter concepts, processes, or topics to visualize..."
                value={customText}
                onChange={(e) => {
                  setCustomText(e.target.value);
                  setSelectedMaterial(null);
                }}
                rows={6}
              />
            </div>

            <Button
              onClick={generateDiagram}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Diagram...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate {diagramType === "flowchart" ? "Flowchart" : "Mind Map"}
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
                <CardTitle>Generated Diagram</CardTitle>
                <CardDescription>
                  Visual representation of your content
                </CardDescription>
              </div>
              {mermaidCode && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadSvg}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isGenerating ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : renderedSvg ? (
              <div className="space-y-4">
                <div 
                  className="mermaid-diagram bg-muted/50 rounded-lg p-4 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: renderedSvg }}
                />
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View Mermaid Code
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {mermaidCode}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your diagram will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
