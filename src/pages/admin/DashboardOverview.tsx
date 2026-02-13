import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts";
import { Users, Activity, BrainCircuit, Clock, Download, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function DashboardOverview() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ["admin-stats"],
        queryFn: adminApi.getStats,
    });

    const { data: activity, isLoading: isLoadingActivity } = useQuery({
        queryKey: ["admin-activity"],
        queryFn: () => adminApi.getActivityLog(10),
    });

    // Mock data for charts
    const activityData = [
        { name: "Mon", quizzes: 4, flashcards: 2, interactions: 10 },
        { name: "Tue", quizzes: 3, flashcards: 5, interactions: 15 },
        { name: "Wed", quizzes: 7, flashcards: 8, interactions: 20 },
        { name: "Thu", quizzes: 5, flashcards: 4, interactions: 12 },
        { name: "Fri", quizzes: 8, flashcards: 10, interactions: 25 },
        { name: "Sat", quizzes: 12, flashcards: 15, interactions: 30 },
        { name: "Sun", quizzes: 10, flashcards: 8, interactions: 18 },
    ];

    const roleData = [
        { name: "Students", value: 400, color: "#0088FE" },
        { name: "Admins", value: 10, color: "#00C49F" },
        { name: "Parents", value: 50, color: "#FFBB28" },
    ];

    const flaggedData = [
        { id: 1, user: "john.doe", reason: "Inappropriate language", output: "Topic: Biology", time: "2 mins ago" },
        { id: 2, user: "jane.smith", reason: "Off-topic query", output: "Topic: Algebra", time: "1 hour ago" },
    ];

    if (!mounted) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                    <p className="text-muted-foreground">Welcome back, Admin. Here's what's happening today.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => adminApi.exportReport()}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Report
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats?.total_users}</div>
                        <p className="text-xs text-muted-foreground">
                            {isLoadingStats ? "..." : stats?.active_users_24h} active today
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Study Sessions</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoadingStats ? "..." : (stats?.total_quizzes || 0) + (stats?.total_flashcards || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            +12% from last week
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Interactions</CardTitle>
                        <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats?.total_interactions}</div>
                        <p className="text-xs text-muted-foreground">
                            Avg. 4.8/5 satisfaction
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">24m</div>
                        <p className="text-xs text-muted-foreground">
                            +2m from yesterday
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Activity Trends</CardTitle>
                        <CardDescription>Daily active users and interactions over the last 7 days.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activityData}>
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="quizzes" stackId="a" fill="#adfa1d" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="flashcards" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="interactions" stackId="a" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>User Roles</CardTitle>
                        <CardDescription>Distribution of user accounts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={roleData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {roleData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-4">
                            {roleData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-xs text-muted-foreground">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Activity Table */}
                <Card className="col-span-4 lg:col-span-5">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest actions performed by users across the platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead className="text-right">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingActivity ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">Loading activity...</TableCell>
                                    </TableRow>
                                ) : activity?.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.user_name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {item.event_type.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{item.details}</TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {format(new Date(item.created_at), "MMM d, h:mm a")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Flagged Conversations */}
                <Card className="col-span-3 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Flagged Content</CardTitle>
                        <CardDescription>AI conversations requiring review.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {flaggedData.map((item) => (
                            <div key={item.id} className="flex flex-col space-y-2 p-3 border rounded-lg bg-destructive/5 border-destructive/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{item.user}</span>
                                    <span className="text-xs text-muted-foreground">{item.time}</span>
                                </div>
                                <div className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {item.reason}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{item.output}</p>
                                <div className="flex gap-2 pt-2">
                                    <Button size="sm" variant="destructive" className="h-7 w-full text-xs">Review</Button>
                                    <Button size="sm" variant="outline" className="h-7 w-full text-xs">Dismiss</Button>
                                </div>
                            </div>
                        ))}
                        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { }}>
                            View All Flagged Items
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
