import { Home, LayoutDashboard, Bot, Layers, ClipboardList, FileText, CalendarDays, User, LogIn, Settings, Shield, Users, ScrollText, GitBranch, FolderOpen } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import tokiLogo from "@/assets/toki-logo.png";

const mainNavItems = [
  { title: "Homepage", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Study Sets", url: "/study-sets", icon: FolderOpen },
  { title: "AI Tutor", url: "/tutor", icon: Bot },
  { title: "Flashcards", url: "/flashcards", icon: Layers },
  { title: "Quizzes", url: "/quizzes", icon: ClipboardList },
  { title: "Essays", url: "/essays", icon: FileText },
  { title: "Summarize", url: "/summarize", icon: ScrollText },
  { title: "Diagrams", url: "/diagrams", icon: GitBranch },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
];

const accountNavItems = [
  { title: "Profile", url: "/profile", icon: User },
];

const adminNavItems = [
  { title: "Admin Panel", url: "/admin", icon: Shield },
];

const parentNavItems = [
  { title: "Parent Dashboard", url: "/parent", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, profile, role } = useAuth();

  const initials = profile?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center justify-center px-2 py-3">
          <img 
            src={tokiLogo} 
            alt="Toki" 
            className={collapsed ? "h-8 w-auto" : "h-10 w-auto"} 
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Learning</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accountNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {role === "parent" && parentNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {role === "admin" && adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <div className="flex items-center justify-between p-2">
          {user ? (
            <NavLink to="/profile" className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar className="h-8 w-8 shrink-0 bg-primary text-primary-foreground text-xs">
                <AvatarFallback className="bg-transparent">
                  {initials || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {profile?.display_name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {role || "student"}
                  </span>
                </div>
              )}
            </NavLink>
          ) : (
            <NavLink
              to="/login"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogIn className="h-4 w-4" />
              {!collapsed && <span>Sign In</span>}
            </NavLink>
          )}
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
