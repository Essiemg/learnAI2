import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";

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
  onColorChange: (index: number) => void;
}

export function ProfileAvatar({ displayName, selectedColor, onColorChange }: ProfileAvatarProps) {
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className={`w-24 h-24 ${avatarColors[selectedColor]} text-white text-2xl font-bold`}>
        <AvatarFallback className="bg-transparent">{initials || "?"}</AvatarFallback>
      </Avatar>
      <div className="text-center">
        <h2 className="text-xl font-semibold">{displayName || "Your Name"}</h2>
      </div>
      <div className="w-full">
        <Label className="text-sm text-muted-foreground mb-2 block text-center">Choose your color</Label>
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
    </div>
  );
}

export { avatarColors };
