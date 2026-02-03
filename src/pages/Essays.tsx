import { useState } from "react";
import { FileText, Send, Loader2, CheckCircle, AlertCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { TopicSelector } from "@/components/TopicSelector";
import { useTopic } from "@/contexts/TopicContext";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { essayApi, EssayFeedback } from "@/lib/api";
import { toast } from "sonner";
import { useEssayHistory } from "@/hooks/useEssayHistory";
import { HistoryPanel } from "@/components/HistoryPanel";
import { cn } from "@/lib/utils";

interface EssayFeedback {
  overallScore: number;
  categories: {
    name: string;
    score: number;
    feedback: string;
  }[];
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
}

export default function Essays() {
  const { currentTopic } = useTopic();
  const { gradeLevel } = useUser();
  const { user, profile } = useAuth();
  const [essayTitle, setEssayTitle] = useState("");
  const [essayContent, setEssayContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<EssayFeedback | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);

  const {
    submissions,
    saveSubmission,
    loadSubmission,
    deleteSubmission,
  } = useEssayHistory();

  const effectiveGradeLevel = profile?.grade_level || gradeLevel;

  const handleSubmit = async () => {
    if (!essayContent.trim()) {
      toast.error("Please write your essay first");
      return;
    }

    if (essayContent.trim().split(/\s+/).length < 50) {
      toast.error("Essay should be at least 50 words");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await essayApi.grade(
        essayTitle || "Untitled",
        essayContent,
        currentTopic?.name,
        effectiveGradeLevel
      );

      if (result?.feedback) {
        setFeedback(result.feedback);

        // Save to local history
        if (user) {
          await saveSubmission(
            essayTitle || null,
            currentTopic?.name || null,
            essayContent,
            result.feedback
          );
        }

        // Track activity
        const activity = JSON.parse(localStorage.getItem("toki_activity") || "{}");
        activity.essaysSubmitted = (activity.essaysSubmitted || 0) + 1;
        localStorage.setItem("toki_activity", JSON.stringify(activity));

        toast.success("Essay graded!");
      } else {
        throw new Error("Could not get feedback");
      }
    } catch (error) {
      console.error("Error grading essay:", error);
      toast.error("Failed to grade essay. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setEssayTitle("");
    setEssayContent("");
    setFeedback(null);
    setViewingHistoryId(null);
  };

  const handleSelectEssay = (id: string) => {
    const submission = loadSubmission(id);
    if (submission) {
      setEssayTitle(submission.title || "");
      setEssayContent(submission.content);
      setFeedback(submission.feedback);
      setViewingHistoryId(id);
    }
  };

  const handleDeleteEssay = async (id: string) => {
    const success = await deleteSubmission(id);
    if (success) {
      toast.success("Essay deleted");
      if (viewingHistoryId === id) {
        handleReset();
      }
    } else {
      toast.error("Failed to delete essay");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-primary";
    if (score >= 80) return "text-blue-500";
    if (score >= 70) return "text-amber-500";
    return "text-destructive";
  };

  const historyItems = submissions.map((s) => ({
    id: s.id,
    title: s.title || "Untitled Essay",
    subtitle: s.topic || undefined,
    date: s.created_at,
    score: s.overall_score || undefined,
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Essays
          </h1>
          <p className="text-muted-foreground">
            Submit essays for AI grading and detailed feedback
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HistoryPanel
            essaySubmissions={historyItems}
            onSelectEssay={handleSelectEssay}
            onDeleteEssay={handleDeleteEssay}
            activeTab="essays"
          />
          <TopicSelector />
        </div>
      </div>

      {!feedback ? (
        /* Essay Input */
        <Card>
          <CardHeader>
            <CardTitle>Write Your Essay</CardTitle>
            <CardDescription>
              {currentTopic
                ? `Write an essay about ${currentTopic.name}`
                : "Select a topic or write on any subject"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="Enter your essay title..."
                value={essayTitle}
                onChange={(e) => setEssayTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="essay">Essay Content</Label>
              <Textarea
                id="essay"
                placeholder="Start writing your essay here... (minimum 50 words)"
                value={essayContent}
                onChange={(e) => setEssayContent(e.target.value)}
                className="min-h-[300px] resize-y"
              />
              <p className="text-xs text-muted-foreground text-right">
                {essayContent.trim().split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || essayContent.trim().split(/\s+/).length < 50}
              className="w-full gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Grading Essay...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit for Grading
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Feedback Display */
        <div className="space-y-6">
          {viewingHistoryId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <History className="h-4 w-4" />
              Viewing saved essay
            </div>
          )}

          {/* Overall Score */}
          <Card className="text-center p-8">
            <div className={cn("text-6xl font-bold mb-2", getScoreColor(feedback.overallScore))}>
              {feedback.overallScore}
            </div>
            <p className="text-muted-foreground">Overall Score</p>
          </Card>

          {/* Category Scores */}
          <Card>
            <CardHeader>
              <CardTitle>Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feedback.categories.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{cat.name}</span>
                    <span className={getScoreColor(cat.score)}>{cat.score}/100</span>
                  </div>
                  <Progress value={cat.score} className="h-2" />
                  <p className="text-sm text-muted-foreground">{cat.feedback}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Strengths & Improvements */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Areas to Improve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.improvements.map((i, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-destructive mt-1">•</span>
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{feedback.detailedFeedback}</p>
            </CardContent>
          </Card>

          <Button onClick={handleReset} variant="outline" className="w-full">
            Write Another Essay
          </Button>
        </div>
      )}
    </div>
  );
}
