import { User, Settings, Link, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type ProfileSection = "account" | "settings" | "parent-link";

interface ProfileSidebarProps {
  activeSection: ProfileSection;
  onSectionChange: (section: ProfileSection) => void;
  showParentLink: boolean;
  onSignOut: () => void;
}

export function ProfileSidebar({
  activeSection,
  onSectionChange,
  showParentLink,
  onSignOut,
}: ProfileSidebarProps) {
  const menuItems = [
    { id: "account" as const, label: "Account", icon: User },
    { id: "settings" as const, label: "Preferences", icon: Settings },
    ...(showParentLink ? [{ id: "parent-link" as const, label: "Link to Parent", icon: Link }] : []),
  ];

  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors",
              activeSection === item.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-4 border-t border-border mt-4">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export type { ProfileSection };
