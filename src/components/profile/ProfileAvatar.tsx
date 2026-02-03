import { useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

const avatarColors = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-green-500",
  "bg-teal-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
];

interface ProfileAvatarProps {
  displayName: string;
  selectedColor: number;
  customAvatar?: string | null;
  onColorChange: (index: number) => void;
  onAvatarChange?: (avatarDataUrl: string | null) => void;
}

export function ProfileAvatar({ 
  displayName, 
  selectedColor, 
  customAvatar,
  onColorChange,
  onAvatarChange 
}: ProfileAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onAvatarChange?.(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    onAvatarChange?.(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className={`w-24 h-24 ${!customAvatar ? avatarColors[selectedColor] : ''} text-white text-2xl font-bold`}>
          {customAvatar ? (
            <AvatarImage src={customAvatar} alt={displayName} />
          ) : null}
          <AvatarFallback className={`${avatarColors[selectedColor]} text-white`}>
            {initials || "?"}
          </AvatarFallback>
        </Avatar>
        
        {/* Overlay for upload */}
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-6 w-6 text-white" />
        </div>
        
        {/* Remove button if custom avatar exists */}
        {customAvatar && (
          <button
            onClick={handleRemoveAvatar}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      
      <div className="text-center">
        <h2 className="text-xl font-semibold">{displayName || "Your Name"}</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-3 w-3 mr-1" />
          {customAvatar ? "Change photo" : "Upload photo"}
        </Button>
      </div>
      
      {!customAvatar && (
        <div className="w-full">
          <Label className="text-sm text-muted-foreground mb-2 block text-center">Or choose a color</Label>
          <div className="flex flex-wrap gap-2 justify-center">
            {avatarColors.map((color, index) => (
              <button
                key={color}
                onClick={() => onColorChange(index)}
                className={`w-8 h-8 rounded-full ${color} transition-transform ${
                  selectedColor === index ? "ring-2 ring-primary ring-offset-2 scale-110" : ""
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { avatarColors };
