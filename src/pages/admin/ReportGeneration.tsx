import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function ReportGeneration() {
    const [date, setDate] = useState<Date>();
    const [reportType, setReportType] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!reportType) {
            toast.error("Please select a report type");
            return;
        }

        setIsGenerating(true);

        try {
            await adminApi.exportReport();
            toast.success("Report generated and downloaded successfully!");
        } catch (error) {
            toast.error("Failed to generate report");
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                <p className="text-muted-foreground">Generate comprehensive reports on system usage, student progress, and AI performance.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-2 md:col-span-1">
                    <CardHeader>
                        <CardTitle>Generate New Report</CardTitle>
                        <CardDescription>Select parameters to create a custom report.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Report Type</Label>
                            <Select onValueChange={setReportType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select report type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student_progress">Student Progress Report</SelectItem>
                                    <SelectItem value="topic_performance">Topic Performance Analysis</SelectItem>
                                    <SelectItem value="ai_quality">AI Interaction Quality</SelectItem>
                                    <SelectItem value="system_usage">System Usage & Engagement</SelectItem>
                                    <SelectItem value="financial">Subscription & Revenue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Date Range (Optional)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="pt-4 flex flex-col gap-2">
                            <Button
                                className="w-full"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    "Generate Report"
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-2 md:col-span-1">
                    <CardHeader>
                        <CardTitle>Recent Reports</CardTitle>
                        <CardDescription>Recently generated reports available for download.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { name: "Monthly Usage Report - Feb 2026", type: "PDF", size: "2.4 MB", date: "2 mins ago" },
                                { name: "Student Progress Summary", type: "Excel", size: "856 KB", date: "4 hours ago" },
                                { name: "AI Interaction Analysis", type: "PDF", size: "4.1 MB", date: "Yesterday" },
                            ].map((report, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-md">
                                            {report.type === "PDF" ? (
                                                <FileText className="h-5 w-5 text-primary" />
                                            ) : (
                                                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{report.name}</p>
                                            <p className="text-xs text-muted-foreground">{report.size} • {report.date}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
