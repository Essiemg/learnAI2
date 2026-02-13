import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    BookOpen,
    Settings,
    FileBarChart,
    ShieldAlert,
    LogOut,
    Bell,
    Search,
    Menu,
    X,
    MessageSquareWarning,
    GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const sidebarItems = [
    {
        title: "Dashboard",
        items: [
            { name: "Overview", href: "/admin", icon: LayoutDashboard },
        ]
    },
    {
        title: "User Management",
        items: [
            { name: "All Users", href: "/admin/users", icon: Users },
            { name: "Roles & Permissions", href: "/admin/roles", icon: ShieldAlert },
        ]
    },
    {
        title: "Learning Content",
        items: [
            { name: "Subjects & Topics", href: "/admin/content", icon: BookOpen },
            { name: "Quizzes", href: "/admin/quizzes", icon: GraduationCap },
        ]
    },
    {
        title: "AI Monitoring",
        items: [
            { name: "Flagged Chats", href: "/admin/flagged", icon: MessageSquareWarning },
        ]
    },
    {
        title: "Reports",
        items: [
            { name: "Analytics", href: "/admin/reports", icon: FileBarChart },
        ]
    },
    {
        title: "Settings",
        items: [
            { name: "System Settings", href: "/admin/settings", icon: Settings },
        ]
    }
];

export function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut, user, profile } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const initials = profile?.display_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "AD";

    return (
        <div className="min-h-screen bg-background flex">
            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen bg-card border-r border-border transition-all duration-300 ease-in-out lg:relative",
                    sidebarOpen ? "w-64" : "w-16",
                    mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                        <div className={cn("flex items-center gap-2 overflow-hidden", !sidebarOpen && "justify-center w-full")}>
                            <div className="rounded-lg bg-primary/10 p-1 shrink-0">
                                <img src="/owl - illustrationImage.png" alt="Logo" className="h-8 w-8 object-cover rounded" />
                            </div>
                            {sidebarOpen && (
                                <span className="font-bold text-lg text-primary truncate">Admin Panel</span>
                            )}
                        </div>
                        {sidebarOpen && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMobileMenuOpen(false)}
                                className="lg:hidden"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    {/* Sidebar Navigation */}
                    <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                        {sidebarItems.map((group, groupIndex) => (
                            <div key={groupIndex}>
                                {sidebarOpen && (
                                    <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {group.title}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = location.pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                to={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                                    isActive
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                                    !sidebarOpen && "justify-center px-2"
                                                )}
                                                title={!sidebarOpen ? item.name : undefined}
                                            >
                                                <item.icon className="h-5 w-5 shrink-0" />
                                                {sidebarOpen && <span>{item.name}</span>}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-border mt-auto">
                        <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className={cn("w-full justify-start p-0 h-auto hover:bg-transparent", !sidebarOpen && "justify-center")}>
                                        <Avatar className="h-9 w-9 border border-border">
                                            <AvatarImage src={profile?.avatar_url} />
                                            <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                                        </Avatar>
                                        {sidebarOpen && (
                                            <div className="flex flex-col items-start ml-2 text-left">
                                                <span className="text-sm font-medium truncate w-[120px]">{profile?.display_name || "Admin"}</span>
                                                <span className="text-xs text-muted-foreground truncate w-[120px]">{user?.email}</span>
                                            </div>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                                        Profile Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Top Navbar */}
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="hidden lg:flex"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>

                        <div className="relative hidden md:block w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search..."
                                className="pl-9 h-9 bg-background"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
                        </Button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6 bg-muted/20">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
