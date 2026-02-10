import { useState } from "react";
import { 
  FileText, TrendingUp, Award, BookOpen, Target, Flame, 
  CheckCircle, AlertCircle, Lightbulb, Download, Clock,
  Loader2, Sparkles, BarChart2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/api";
import { motion } from "framer-motion";

interface ProgressReportData {
  total_quizzes: number;
  average_score: number;
  total_flashcards: number;
  total_summaries: number;
  total_diagrams: number;
  topics_studied: string[];
  strengths: string[];
  areas_for_improvement: string[];
  ai_feedback: string;
  recommendations: string[];
  study_streak: number;
  total_study_time: number;
  generated_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function ProgressReport() {
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<ProgressReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateReport = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/reports/progress`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const data = await response.json();
      setReport(data);
      setIsOpen(true);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error generating report",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const reportText = `
══════════════════════════════════════════════════════
           LEARNING PROGRESS REPORT - TOKI AI
══════════════════════════════════════════════════════
Generated: ${new Date(report.generated_at).toLocaleString()}

═══ OVERVIEW ═══
📊 Total Quizzes Completed: ${report.total_quizzes}
🎯 Average Score: ${report.average_score}%
📚 Flashcard Sets: ${report.total_flashcards}
📝 Summaries Created: ${report.total_summaries}
📊 Diagrams Created: ${report.total_diagrams}
🔥 Study Streak: ${report.study_streak} days
⏱️ Total Study Time: ${report.total_study_time} minutes

═══ TOPICS STUDIED ═══
${report.topics_studied.length > 0 ? report.topics_studied.map(t => `• ${t}`).join('\n') : '• No topics yet'}

═══ STRENGTHS ═══
${report.strengths.map(s => `${s}`).join('\n')}

═══ AREAS FOR IMPROVEMENT ═══
${report.areas_for_improvement.map(a => `${a}`).join('\n')}

═══ AI TUTOR FEEDBACK ═══
${report.ai_feedback}

═══ RECOMMENDATIONS ═══
${report.recommendations.map(r => `${r}`).join('\n')}

══════════════════════════════════════════════════════
                Keep learning, keep growing! 🚀
══════════════════════════════════════════════════════
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toki-progress-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report downloaded!",
      description: "Check your downloads folder",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Just Starting';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={generateReport}
          disabled={loading}
          size="lg"
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <TrendingUp className="h-5 w-5 mr-2" />
              Generate Progress Report
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                <TrendingUp className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <DialogTitle className="text-xl">Your Learning Progress</DialogTitle>
                <DialogDescription>
                  AI-powered insights on your learning journey
                </DialogDescription>
              </div>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {report && (
          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="p-6 pt-4 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-blue-500/20 bg-blue-500/5">
                    <CardContent className="p-4 text-center">
                      <BookOpen className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">{report.total_quizzes}</p>
                      <p className="text-xs text-muted-foreground">Quizzes</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <Card className={`border ${getScoreBg(report.average_score)}`}>
                    <CardContent className="p-4 text-center">
                      <Award className={`h-6 w-6 mx-auto mb-2 ${getScoreColor(report.average_score)}`} />
                      <p className="text-2xl font-bold">{report.average_score}%</p>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="border-teal-500/20 bg-teal-500/5">
                    <CardContent className="p-4 text-center">
                      <Target className="h-6 w-6 mx-auto mb-2 text-teal-500" />
                      <p className="text-2xl font-bold">{report.total_flashcards}</p>
                      <p className="text-xs text-muted-foreground">Flashcards</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  <Card className="border-orange-500/20 bg-orange-500/5">
                    <CardContent className="p-4 text-center">
                      <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                      <p className="text-2xl font-bold">{report.study_streak}</p>
                      <p className="text-xs text-muted-foreground">Day Streak</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Score Progress */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Performance Level</span>
                  <Badge variant="secondary" className={getScoreColor(report.average_score)}>
                    {getScoreLabel(report.average_score)}
                  </Badge>
                </div>
                <Progress value={report.average_score} className="h-3" />
              </motion.div>

              <Separator />

              {/* AI Feedback */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  <span className="font-semibold text-violet-700 dark:text-violet-300">AI Tutor Feedback</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{report.ai_feedback}</p>
              </motion.div>

              {/* Topics Studied */}
              {report.topics_studied.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    Topics Studied
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {report.topics_studied.map((topic, i) => (
                      <Badge key={i} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Strengths & Improvements */}
              <div className="grid md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {report.strengths.map((strength, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Areas to Improve
                  </h4>
                  <ul className="space-y-2">
                    {report.areas_for_improvement.map((area, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {area}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              {/* Recommendations */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
              >
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-500" />
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {rec}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Download & Timestamp */}
              <div className="space-y-3">
                <Button onClick={downloadReport} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Generated on {new Date(report.generated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
