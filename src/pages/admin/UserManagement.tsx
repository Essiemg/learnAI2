import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, UserSummary } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, Search, UserCheck, UserX, Shield, Clock, BookOpen, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export default function UserManagement() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);

    const { data: users, isLoading, refetch } = useQuery({
        queryKey: ["admin-users"],
        queryFn: () => adminApi.getUsers(100),
    });

    const filteredUsers = users?.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = selectedRole ? user.role === selectedRole : true;
        return matchesSearch && matchesRole;
    });

    const activeUsers = filteredUsers?.filter(u => u.last_active && new Date(u.last_active).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000); // Active in last 7 days
    const inactiveUsers = filteredUsers?.filter(u => !activeUsers?.includes(u));

    // Mock actions
    const handleSuspend = (userId: string) => {
        toast.success("User suspended successfully");
        // In real app, call api.suspendUser(userId)
    };

    const handleActivate = (userId: string) => {
        toast.success("User activated successfully");
        // In real app, call api.activateUser(userId)
    };

    const handleResetPassword = (userId: string) => {
        toast.success("Password reset email sent");
        // In real app, call api.resetPassword(userId)
    };

    const UserTable = ({ data }: { data: UserSummary[] | undefined }) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead className="text-right">Stats</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">Loading users...</TableCell>
                        </TableRow>
                    ) : data?.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">No users found</TableCell>
                        </TableRow>
                    ) : (
                        data?.map((user) => (
                            <TableRow
                                key={user.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setSelectedUser(user)}
                            >
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>{user.grade}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {format(new Date(user.created_at), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {user.last_active
                                        ? format(new Date(user.last_active), "MMM d, h:mm a")
                                        : "Never"}
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                    <div>{user.stats.quizzes} quizzes</div>
                                    <div>{user.stats.flashcards} sets</div>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                                                View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                                                Copy ID
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                                                Reset Password
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleSuspend(user.id)} className="text-destructive">
                                                <UserX className="mr-2 h-4 w-4" />
                                                Suspend User
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Manage user access, roles, and view activity.</p>
                </div>
                <div className="flex gap-2">
                    <Button>Add User</Button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {/* Role Filter Buttons could go here */}
                </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList>
                    <TabsTrigger value="all">All Users</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="suspended">Suspended</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4">
                    <UserTable data={filteredUsers} />
                </TabsContent>
                <TabsContent value="active" className="mt-4">
                    <UserTable data={activeUsers} />
                </TabsContent>
                <TabsContent value="suspended" className="mt-4">
                    <div className="rounded-md border p-8 text-center text-muted-foreground">
                        No suspended users found.
                    </div>
                </TabsContent>
            </Tabs>

            <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <SheetContent className="overflow-y-auto sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>User Details</SheetTitle>
                        <SheetDescription>
                            View and manage user information and activity.
                        </SheetDescription>
                    </SheetHeader>

                    {selectedUser && (
                        <div className="space-y-6 py-6">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                                    {selectedUser.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                    <div className="flex gap-2 mt-1">
                                        <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                                            {selectedUser.role}
                                        </Badge>
                                        <Badge variant="outline">Grade {selectedUser.grade}</Badge>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> Activity Overview
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-muted/30 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Joined</p>
                                        <p className="text-sm font-medium">{format(new Date(selectedUser.created_at), "PPP")}</p>
                                    </div>
                                    <div className="p-3 bg-muted/30 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Last Active</p>
                                        <p className="text-sm font-medium">
                                            {selectedUser.last_active
                                                ? format(new Date(selectedUser.last_active), "PPP")
                                                : "Never"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" /> Learning Stats
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border rounded-lg p-3">
                                        <div className="text-2xl font-bold">{selectedUser.stats.quizzes}</div>
                                        <div className="text-xs text-muted-foreground">Quizzes Taken</div>
                                    </div>
                                    <div className="border rounded-lg p-3">
                                        <div className="text-2xl font-bold">{selectedUser.stats.flashcards}</div>
                                        <div className="text-xs text-muted-foreground">Flashcard Sets</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Actions
                                </h4>
                                <div className="space-y-2">
                                    <Button variant="outline" className="w-full justify-start" onClick={() => handleResetPassword(selectedUser.id)}>
                                        Reset Password
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => handleSuspend(selectedUser.id)}>
                                        Suspend User Account
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
