import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    BookOpen,
    Brain,
    FileText,
    PenTool,
    BarChart,
    Search,
    Filter,
    Calendar,
    Clock,
    ArrowRight,
    Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface LibraryItem {
    id: string;
    type: "quiz" | "flashcard" | "summary" | "essay" | "diagram";
    title: string;
    topic?: string;
    created_at: string;
    metadata?: any;
}

export default function Library() {
    const { user } = useAuth();
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        fetchLibraryItems();
    }, []);

    const fetchLibraryItems = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await fetch("http://localhost:8000/api/library?limit=100", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setItems(data);
            }
        } catch (error) {
            console.error("Failed to fetch library items:", error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "quiz": return <Brain className="h-5 w-5 text-amber-500" />;
            case "flashcard": return <BookOpen className="h-5 w-5 text-emerald-500" />;
            case "summary": return <FileText className="h-5 w-5 text-blue-500" />;
            case "essay": return <PenTool className="h-5 w-5 text-pink-500" />;
            case "diagram": return <BarChart className="h-5 w-5 text-purple-500" />;
            default: return <FileText className="h-5 w-5" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "quiz": return "Quiz";
            case "flashcard": return "Flashcards";
            case "summary": return "Summary";
            case "essay": return "Essay";
            case "diagram": return "Diagram";
            default: return "Content";
        }
    };

    const getLink = (item: LibraryItem) => {
        switch (item.type) {
            case "quiz": return `/quizzes/${item.id}`; // Assuming separate view/attempt page logic exists or will be added
            case "flashcard": return `/flashcards/${item.id}`; // Flashcards usually have session IDs, checking backend... Library returns Set ID. Routes assume Session ID?
                // Backend Note: Library returns FlashcardSet.id. Flashcard routes get /{session_id}. 
                // We might need a way to "start" a session from a set.
                // For now, let's link to a generic viewer or just the tools page if dedicated viewer isn't ready.
                // Actually, looking at router info: Flashcard routes operate on FlashcardSession. 
                // Library returns FlashcardSet. We likely need a "create session from set" flow or just view the component.
                // Changing this to just /flashcards for now or strictly handling ID if the page supports it.
                // Ideally: /study-sets handles sets. But this is "My Library".
                // Let's assume we link to the tool with a query param? or if the route supports ID.
                // Flashcards.tsx seems to be the generator.
                // Quizzes.tsx seems to be the generator.
                // We might need to update those pages to accept an ID to load.
                return `/${item.type}s`;

            case "summary": return `/summarize?id=${item.id}`; // Hypothetical
            case "essay": return `/essays?id=${item.id}`;
            case "diagram": return `/diagrams?id=${item.id}`;
            default: return "/dashboard";
        }
    };

    // Correction: The default pages often just "generate". 
    // We need to verify if we can "view" an existing item.
    // For MVP, we list them. Clicking might just take you to the tool page where we can implemented "Load" logic later or now.
    // Let's try to pass ID via state or query param.

    const filteredItems = items.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.topic && item.topic.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesTab = activeTab === "all" || item.type === activeTab;
        return matchesSearch && matchesTab;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Your Library
                    </h1>
                    <p className="text-muted-foreground">
                        All your generated quizzes, flashcards, summaries, and more.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search library..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6 lg:w-[600px]">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="quiz">Quizzes</TabsTrigger>
                    <TabsTrigger value="flashcard">Cards</TabsTrigger>
                    <TabsTrigger value="summary">Summaries</TabsTrigger>
                    <TabsTrigger value="essay">Essays</TabsTrigger>
                    <TabsTrigger value="diagram">Diagrams</TabsTrigger>
                </TabsList>
            </Tabs>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredItems.length === 0 ? (
                <Card className="p-12 text-center bg-muted/20 border-dashed">
                    <div className="flex justify-center mb-4">
                        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Library is empty</h3>
                    <p className="text-muted-foreground mb-6">
                        Generate some content to see it here.
                    </p>
                    <Button asChild>
                        <Link to="/dashboard">Go to Dashboard</Link>
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="flex items-center gap-1 mb-2">
                                            {getIcon(item.type)}
                                            <span className="capitalize">{getTypeLabel(item.type)}</span>
                                        </Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                                        {item.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground mb-4">
                                        {item.topic && (
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-muted px-2 py-0.5 rounded text-xs">{item.topic}</span>
                                            </div>
                                        )}
                                        {item.metadata && (
                                            <div className="text-xs opacity-70">
                                                {item.type === 'quiz' && `${item.metadata.question_count || 0} Questions`}
                                                {item.type === 'flashcard' && `${item.metadata.card_count || 0} Cards`}
                                                {item.type === 'essay' && `Score: ${item.metadata.score || 'N/A'}`}
                                            </div>
                                        )}
                                    </div>
                                    <Button variant="ghost" size="sm" className="w-full justify-between group-hover:bg-primary/5" asChild>
                                        {/* For MVP, just link to the main tool page, eventually we'd want /tool/:id */}
                                        <Link to={getLink(item)}>
                                            View Content
                                            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
