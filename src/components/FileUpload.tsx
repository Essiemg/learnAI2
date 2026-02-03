import { useState, useRef } from "react";
import { Upload, X, FileText, Image, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  path?: string;
  extractedText?: string;
  base64?: string;
}

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  files: UploadedFile[];
  maxFiles?: number;
  acceptTypes?: string;
  showExtractedText?: boolean;
}

const FILE_ICONS: Record<string, React.ElementType> = {
  image: Image,
  pdf: FileText,
  text: FileText,
  default: File,
};

const STORAGE_KEY = "learnai_uploaded_files";

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return FILE_ICONS.image;
  if (type === "application/pdf") return FILE_ICONS.pdf;
  if (type.startsWith("text/")) return FILE_ICONS.text;
  return FILE_ICONS.default;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function FileUpload({ 
  onFilesChange, 
  files, 
  maxFiles = 5, 
  acceptTypes = "image/*,.pdf,.txt,.doc,.docx",
  showExtractedText = false
}: FileUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: globalThis.File): Promise<UploadedFile | null> => {
    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} is too large. Maximum size is 10MB.`);
      return null;
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
    };

    // Convert to base64 for storage and AI processing
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        uploadedFile.base64 = reader.result as string;
        
        // Store in localStorage if user is logged in
        if (user) {
          try {
            const filePath = `${user.id}/${uploadedFile.id}-${file.name}`;
            uploadedFile.path = filePath;
            
            // Save to localStorage
            const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
            const existingFiles = stored ? JSON.parse(stored) : [];
            existingFiles.push({
              id: uploadedFile.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
              base64_data: uploadedFile.base64,
              created_at: new Date().toISOString(),
            });
            localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(existingFiles));
          } catch (e) {
            console.error("Storage error:", e);
          }
        }
        
        resolve(uploadedFile);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (fileList: FileList) => {
    if (files.length >= maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const remaining = maxFiles - files.length;
    const toProcess = Array.from(fileList).slice(0, remaining);

    setIsUploading(true);
    try {
      const processed = await Promise.all(toProcess.map(processFile));
      const valid = processed.filter((f): f is UploadedFile => f !== null);
      onFilesChange([...files, ...valid]);
      
      if (valid.length > 0) {
        toast.success(`${valid.length} file(s) uploaded`);
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file?.path && user) {
      try {
        // Remove from localStorage
        const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
        if (stored) {
          const existingFiles = JSON.parse(stored);
          const updatedFiles = existingFiles.filter((f: any) => f.file_path !== file.path);
          localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(updatedFiles));
        }
      } catch (e) {
        console.error("Delete error:", e);
      }
    }
    onFilesChange(files.filter((f) => f.id !== fileId));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground">
              Images, PDFs, and documents (max {maxFiles} files, 10MB each)
            </p>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <Card key={file.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-10 h-10 rounded bg-muted flex items-center justify-center">
                      {file.type.startsWith("image/") && file.base64 ? (
                        <img src={file.base64} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleRemove(file.id); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {showExtractedText && file.extractedText && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                      {file.extractedText}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
