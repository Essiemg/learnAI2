import { useState, useRef, KeyboardEvent } from "react";
import { Send, ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, imageData?: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    setIsProcessingImage(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setIsProcessingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing image:", error);
      setIsProcessingImage(false);
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  const handleSend = () => {
    if ((!message.trim() && !imagePreview) || isLoading || disabled) return;

    onSend(message, imagePreview || undefined);
    setMessage("");
    setImagePreview(null);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (message.trim() || imagePreview) && !isLoading && !disabled;

  return (
    <div className="border-t border-border bg-background p-4 safe-bottom">
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <img
            src={imagePreview}
            alt="Homework to upload"
            className="max-h-24 rounded-lg border border-border"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleRemoveImage}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Image upload button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isProcessingImage}
            aria-label="Upload homework image"
          >
            {isProcessingImage ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              imagePreview
                ? "Ask about this homework..."
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
        StudyBuddy helps you learn — it won't just give you the answers! 💡
      </p>
    </div>
  );
}
