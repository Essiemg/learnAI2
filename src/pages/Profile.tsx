import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, LogOut, User, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

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

export default function Profile() {
  const { profile, role, updateProfile, signOut, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [gradeLevel, setGradeLevel] = useState(profile?.grade_level?.toString() || "");
  const [selectedColor, setSelectedColor] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    navigate("/login");
    return null;
  }

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    setIsSaving(true);

    const updates: Record<string, unknown> = {
      display_name: displayName.trim(),
      avatar_url: avatarColors[selectedColor],
    };

    if (role === "child" && gradeLevel) {
      updates.grade_level = parseInt(gradeLevel, 10);
    }

    const { error } = await updateProfile(updates);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated! 🎉");
    }

    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/login");
  };

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleInfo = {
    child: { icon: User, label: "Student", color: "text-blue-500" },
    parent: { icon: Users, label: "Parent", color: "text-green-500" },
    admin: { icon: Shield, label: "Administrator", color: "text-purple-500" },
  };

  const RoleIcon = roleInfo[role || "child"].icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Profile Settings</h1>
        <ThemeToggle />
      </header>

      <div className="p-4 max-w-md mx-auto space-y-6">
        {/* Avatar Section */}
        <Card>
          <CardHeader className="text-center">
            <Avatar className={`w-24 h-24 mx-auto ${avatarColors[selectedColor]} text-white text-2xl font-bold`}>
              <AvatarFallback className="bg-transparent">{initials || "?"}</AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4">{displayName || "Your Name"}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-1">
              <RoleIcon className={`h-4 w-4 ${roleInfo[role || "child"].color}`} />
              {roleInfo[role || "child"].label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label className="text-sm text-muted-foreground mb-2 block">Choose your color</Label>
            <div className="flex flex-wrap gap-2 justify-center">
              {avatarColors.map((color, index) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(index)}
                  className={`w-8 h-8 rounded-full ${color} transition-transform ${
                    selectedColor === index ? "ring-2 ring-primary ring-offset-2 scale-110" : ""
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            {role === "child" && (
              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Grade Level</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((grade) => (
                      <SelectItem key={grade} value={grade.toString()}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleSave} className="w-full" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
