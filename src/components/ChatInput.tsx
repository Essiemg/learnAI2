import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Paperclip, X, Loader2, Mic, MicOff, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { toast } from "sonner";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  base64: string;
}

interface ChatInputProps {
  onSend: (message: string, imageData?: string, files?: UploadedFile[]) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isListening, transcript, toggleListening } = useVoiceInput({
    onTranscript: (text) => {
      setMessage((prev) => prev + (prev ? " " : "") + text);
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  // Update message with interim transcript
  useEffect(() => {
    if (isListening && transcript) {
      // Show interim results while speaking
    }
  }, [isListening, transcript]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    if (files.length >= 5) {
      toast.error("Maximum 5 files allowed");
      return;
    }

    setIsProcessingFile(true);

    try {
      const processedFiles: UploadedFile[] = [];

      for (const file of Array.from(fileList)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        processedFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          base64,
        });
      }

      setFiles((prev) => [...prev, ...processedFiles].slice(0, 5));
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process file");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSend = () => {
    if ((!message.trim() && files.length === 0) || isLoading || disabled) return;

    // If there's only one image file, send it as imageData for backward compatibility
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 1 && files.length === 1) {
      onSend(message, imageFiles[0].base64);
    } else {
      onSend(message, undefined, files.length > 0 ? files : undefined);
    }

    setMessage("");
    setFiles([]);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (message.trim() || files.length > 0) && !isLoading && !disabled;

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    return FileText;
  };

  return (
    <div className="border-t border-border bg-background p-4 safe-bottom">
      {/* File previews */}
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.type);
            const isImage = file.type.startsWith("image/");

            return (
              <div
                key={file.id}
                className="relative group bg-muted rounded-lg overflow-hidden"
              >
                {isImage ? (
                  <img
                    src={file.base64}
                    alt={file.name}
                    className="h-16 w-16 object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 flex flex-col items-center justify-center p-2">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground truncate max-w-full mt-1">
                      {file.name.split(".").pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveFile(file.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Voice transcript indicator */}
      {isListening && (
        <div className="mb-2 flex items-center gap-2 text-sm text-primary animate-pulse">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Listening... {transcript && `"${transcript}"`}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File upload button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.doc,.docx"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isProcessingFile || files.length >= 5}
            aria-label="Upload file"
          >
            {isProcessingFile ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Voice input button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "rounded-full",
            isListening && "bg-red-100 text-red-600 dark:bg-red-900/30"
          )}
          onClick={toggleListening}
          disabled={isLoading || disabled}
          aria-label={isListening ? "Stop recording" : "Start voice input"}
        >
          {isListening ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {/* Text input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              files.length > 0
                ? "Ask about these files..."
                : isListening
                ? "Listening..."
                : "Ask me anything about your homework!"
            }
            className="min-h-[44px] max-h-32 resize-none rounded-2xl pr-12 bg-muted border-0 focus-visible:ring-2 focus-visible:ring-primary"
            rows={1}
            disabled={isLoading || disabled}
          />
        </div>

        {/* Send button */}
        <Button
          size="icon"
          className={cn(
            "rounded-full h-11 w-11 transition-all",
            canSend ? "glow-primary" : ""
          )}
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-2">
        StudyBuddy helps you learn — it won't just give you the answers!
      </p>
    </div>
  );
}
