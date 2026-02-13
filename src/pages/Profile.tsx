import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, User, Shield, Users, Mail, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEducation } from "@/hooks/useEducation";
import { ProfileAvatar, avatarColors } from "@/components/profile/ProfileAvatar";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { ProfileSidebar, ProfileSection } from "@/components/profile/ProfileSidebar";
import { PreferencesSection } from "@/components/profile/PreferencesSection";
import { LinkToParent } from "@/components/profile/LinkToParent";

export default function Profile() {
  const { user, profile, role, updateProfile, updateAvatar, signOut, isLoading: authLoading } = useAuth();
  const { userEducation } = useEducation();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [gradeLevel, setGradeLevel] = useState(profile?.grade_level?.toString() || "");
  const [selectedColor, setSelectedColor] = useState(0);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLinkedToParent, setIsLinkedToParent] = useState(!!profile?.parent_id);
  const [activeSection, setActiveSection] = useState<ProfileSection>("account");

  const isPrimaryStudent = role === "child" && userEducation?.education_level === "primary";

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setGradeLevel(profile.grade_level?.toString() || "");
      setIsLinkedToParent(!!profile.parent_id);

      // Check if avatar_url is a data URL (custom image) or a color class
      if (profile.avatar_url && profile.avatar_url.startsWith('data:')) {
        setCustomAvatar(profile.avatar_url);
      } else {
        setCustomAvatar(null);
        const colorIndex = avatarColors.findIndex(c => c === profile.avatar_url);
        if (colorIndex !== -1) setSelectedColor(colorIndex);
      }
    }
  }, [profile]);

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

  const handleAvatarChange = async (avatarDataUrl: string | null) => {
    setCustomAvatar(avatarDataUrl);
    if (avatarDataUrl) {
      await updateAvatar(avatarDataUrl);
      toast.success("Profile picture updated!");
    } else {
      // Remove custom avatar, revert to color
      await updateAvatar(avatarColors[selectedColor]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    const updates: Record<string, unknown> = {
      display_name: displayName.trim(),
      avatar_url: customAvatar || avatarColors[selectedColor],
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

  const roleInfo = {
    child: { icon: User, label: "Student", color: "text-blue-500" },
    parent: { icon: Users, label: "Parent", color: "text-green-500" },
    admin: { icon: Shield, label: "Administrator", color: "text-purple-500" },
  };

  // Handle potential 'student' role from legacy backend data
  const normalizedRole = (role as string) === "student" ? "child" : (role || "child");
  const roleData = roleInfo[normalizedRole as UserRole] || roleInfo["child"];
  const RoleIcon = roleData.icon;

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return (
          <ProfileSettings
            displayName={displayName}
            gradeLevel={gradeLevel}
            role={role}
            onDisplayNameChange={setDisplayName}
            onGradeLevelChange={setGradeLevel}
            onSave={handleSave}
            isSaving={isSaving}
          />
        );
      case "settings":
        return <PreferencesSection />;
      case "parent-link":
        return (
          <LinkToParent
            isLinked={isLinkedToParent}
            onLinkSuccess={() => setIsLinkedToParent(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Profile & Settings</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveSection("settings")}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </header>

      <div className="flex flex-col md:flex-row max-w-5xl mx-auto p-4 gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-72 shrink-0">
          <Card>
            <CardContent className="p-6">
              {/* User Profile Card */}
              <div className="mb-6 pb-6 border-b border-border">
                <div className="flex flex-col items-center">
                  <ProfileAvatar
                    displayName={displayName}
                    selectedColor={selectedColor}
                    customAvatar={customAvatar}
                    onColorChange={setSelectedColor}
                    onAvatarChange={handleAvatarChange}
                  />

                  {/* User Name */}
                  <h2 className="mt-4 text-xl font-bold text-foreground">
                    {profile.display_name || "User"}
                  </h2>

                  {/* Email/Username */}
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{user?.email || "No email"}</span>
                  </div>

                  {/* Role Badge */}
                  <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-sm">
                    <RoleIcon className={`h-4 w-4 ${roleInfo[role || "child"].color}`} />
                    <span className="font-medium">{roleInfo[role || "child"].label}</span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <ProfileSidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                showParentLink={isPrimaryStudent}
                onSignOut={handleSignOut}
              />
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeSection === "account" && "Account Details"}
                {activeSection === "settings" && "Preferences"}
                {activeSection === "parent-link" && "Link to Parent"}
              </CardTitle>
              <CardDescription>
                {activeSection === "account" && "Manage your personal information"}
                {activeSection === "settings" && "Customize your Toki experience"}
                {activeSection === "parent-link" && "Connect your account to a parent"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
