import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Users, GraduationCap, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

interface UserData {
  id: string;
  user_id: string;
  display_name: string;
  grade_level: number | null;
  avatar_url: string | null;
  role?: string;
}

export default function AdminDashboard() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      // For now, just show the current user as admin view isn't implemented
      // In production, this would fetch from an admin API endpoint
      if (user) {
        setUsers([
          {
            id: user.id,
            user_id: user.id,
            display_name: user.name || user.email,
            grade_level: user.grade || null,
            avatar_url: null,
            role: role || "child",
          },
        ]);
      }
      setIsLoading(false);
    };

    if (role === "admin") {
      fetchUsers();
    }
  }, [role, user]);

  if (role !== "admin") {
    toast.error("Access denied");
    navigate("/");
    return null;
  }

  const getRoleBadge = (userRole: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; icon: typeof Shield }> = {
      admin: { variant: "default", icon: Shield },
      parent: { variant: "secondary", icon: Users },
      child: { variant: "outline", icon: GraduationCap },
    };
    const config = variants[userRole] || variants.child;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {userRole}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Admin Dashboard
        </h1>
        <ThemeToggle />
      </header>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-primary">{users.length}</div>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-green-500">
                {users.filter((u) => u.role === "child").length}
              </div>
              <p className="text-sm text-muted-foreground">Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-blue-500">
                {users.filter((u) => u.role === "parent").length}
              </div>
              <p className="text-sm text-muted-foreground">Parents</p>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Manage all registered users</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className={`h-10 w-10 ${user.avatar_url || "bg-primary"} text-primary-foreground`}>
                      <AvatarFallback className="bg-transparent">
                        {user.display_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{user.display_name}</div>
                      {user.grade_level && (
                        <p className="text-sm text-muted-foreground">Grade {user.grade_level}</p>
                      )}
                    </div>
                    {getRoleBadge(user.role || "child")}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
