import { useState, useEffect } from "react";
import { GitBranch, Loader2, Copy, Check, Sparkles, Download, FolderOpen, History, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialSelector } from "@/components/MaterialSelector";
import { diagramApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useDiagramHistory } from "@/hooks/useDiagramHistory";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import mermaid from "mermaid";

interface SelectedMaterial {
  id: string;
  name: string;
  type: string;
  base64: string;
}

export default function Diagrams() {
  const { user } = useAuth();
  const { diagrams, saveDiagram, deleteDiagram, isLoading: historyLoading } = useDiagramHistory();
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [customText, setCustomText] = useState("");
  const [mermaidCode, setMermaidCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diagramType, setDiagramType] = useState<"flowchart" | "mindmap">("flowchart");
  const [renderedSvg, setRenderedSvg] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");

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
    let title = "";
    let isBase64 = false;

    if (selectedMaterials.length > 0) {
      contentToVisualize = selectedMaterials[0].base64;
      title = selectedMaterials[0].name;
      isBase64 = true;
    } else if (customText.trim()) {
      contentToVisualize = customText.trim();
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
    setMermaidCode("");
    setRenderedSvg("");
    setCurrentTitle(title);

    try {
      const result = await diagramApi.generate(contentToVisualize, diagramType, isBase64);

      if (result?.mermaid_code) {
        setMermaidCode(result.mermaid_code);
        // Auto-save diagram
        await saveDiagram(
          result.mermaid_code,
          diagramType,
          title,
          isBase64 ? undefined : contentToVisualize,
          selectedMaterials.length > 0 ? selectedMaterials[0].id : undefined
        );
        toast({ title: "Diagram saved!" });
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

  const loadSavedDiagram = (savedDiagram: typeof diagrams[0]) => {
    setMermaidCode(savedDiagram.mermaid_code);
    setDiagramType(savedDiagram.diagram_type as "flowchart" | "mindmap");
    setCurrentTitle(savedDiagram.title || "Saved Diagram");
    if (savedDiagram.source_text) {
      setCustomText(savedDiagram.source_text);
    }
    setShowHistory(false);
    toast({ title: "Diagram loaded" });
  };

  const handleDeleteDiagram = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await deleteDiagram(id);
    if (success) {
      toast({ title: "Diagram deleted" });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitBranch className="h-8 w-8 text-primary" />
            Diagram Generator
          </h1>
          <p className="text-muted-foreground">
            Create flowcharts and mind maps from your study materials
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          History ({diagrams.length})
        </Button>
      </div>

      {showHistory && diagrams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved Diagrams</CardTitle>
            <CardDescription>Click to view a previous diagram</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {diagrams.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => loadSavedDiagram(d)}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{d.title || "Untitled Diagram"}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.diagram_type === "flowchart" ? "Flowchart" : "Mind Map"} • {format(new Date(d.created_at), "MMM d, yyyy 'at' h:mm a")}
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
                        onClick={(e) => handleDeleteDiagram(d.id, e)}
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
              Provide content to visualize as a diagram
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                Or enter text directly
              </label>
              <Textarea
                placeholder="Enter concepts, processes, or topics to visualize..."
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentTitle || "Generated Diagram"}</CardTitle>
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
