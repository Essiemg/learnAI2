import { useState } from "react";
import { Link2, Youtube, Video, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface LinkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (url: string, name: string) => Promise<boolean>;
  studySetId?: string | null;
}

const SUPPORTED_PATTERNS = [
  { pattern: /youtube\.com\/watch\?v=/, name: "YouTube Video", icon: Youtube },
  { pattern: /youtu\.be\//, name: "YouTube Video", icon: Youtube },
  { pattern: /meet\.google\.com\//, name: "Google Meet Recording", icon: Video },
  { pattern: /drive\.google\.com\//, name: "Google Drive", icon: Link2 },
  { pattern: /docs\.google\.com\//, name: "Google Docs", icon: Link2 },
];

function detectLinkType(url: string) {
  for (const { pattern, name, icon } of SUPPORTED_PATTERNS) {
    if (pattern.test(url)) {
      return { name, icon };
    }
  }
  return { name: "Web Link", icon: Link2 };
}

function extractVideoTitle(url: string): string {
  // Try to extract a meaningful name from the URL
  try {
    const urlObj = new URL(url);
    
    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = urlObj.searchParams.get("v") || urlObj.pathname.split("/").pop();
      return `YouTube Video (${videoId?.slice(0, 8) || "unknown"})`;
    }
    
    // Google Meet
    if (url.includes("meet.google.com")) {
      const meetId = urlObj.pathname.split("/").pop();
      return `Google Meet Recording (${meetId?.slice(0, 8) || "unknown"})`;
    }
    
    // Google Drive/Docs
    if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
      return "Google Document";
    }
    
    // Fallback to hostname
    return urlObj.hostname;
  } catch {
    return "External Link";
  }
}

export function LinkUploadDialog({
  open,
  onOpenChange,
  onUpload,
  studySetId,
}: LinkUploadDialogProps) {
  const [url, setUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const linkType = url ? detectLinkType(url) : null;
  const Icon = linkType?.icon || Link2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsUploading(true);
    try {
      const name = customName.trim() || extractVideoTitle(url);
      const success = await onUpload(url.trim(), name);
      
      if (success) {
        toast.success("Link added successfully");
        setUrl("");
        setCustomName("");
        onOpenChange(false);
      } else {
        toast.error("Failed to add link");
      }
    } catch (error) {
      console.error("Error adding link:", error);
      toast.error("Failed to add link");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setUrl("");
    setCustomName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Add Link
          </DialogTitle>
          <DialogDescription>
            Add a YouTube video, Google Meet recording, or other web link to your study materials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <div className="relative">
              <Input
                id="url"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pr-10"
              />
              {linkType && (
                <Icon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {linkType && (
              <p className="text-xs text-muted-foreground">
                Detected: {linkType.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              placeholder="e.g., Biology Lecture Week 3"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Give this link a descriptive name for easy reference
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!url.trim() || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                "Add Link"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
