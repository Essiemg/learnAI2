import { useState } from "react";
import { FileText, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { TopicSelector } from "@/components/TopicSelector";
import { useTopic } from "@/contexts/TopicContext";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [essayTitle, setEssayTitle] = useState("");
  const [essayContent, setEssayContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<EssayFeedback | null>(null);

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
      const { data, error } = await supabase.functions.invoke("tutor-chat", {
        body: {
          messages: [
            {
              role: "user",
              content: `You are an essay grading assistant. Grade the following essay for a grade ${gradeLevel} student${currentTopic ? ` on the topic of "${currentTopic.name}"` : ""}.

Title: ${essayTitle || "Untitled"}

Essay:
${essayContent}

Provide detailed feedback. Return ONLY a valid JSON object with exactly this format, no other text:
{
  "overallScore": 85,
  "categories": [
    {"name": "Content & Ideas", "score": 80, "feedback": "specific feedback"},
    {"name": "Organization", "score": 85, "feedback": "specific feedback"},
    {"name": "Voice & Style", "score": 90, "feedback": "specific feedback"},
    {"name": "Grammar & Mechanics", "score": 85, "feedback": "specific feedback"}
  ],
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "detailedFeedback": "2-3 paragraphs of detailed, encouraging feedback with specific suggestions"
}

Be encouraging and constructive. Provide age-appropriate feedback.`,
            },
          ],
          gradeLevel,
        },
      });

      if (error) throw error;

      // Parse the response
      let content = "";
      if (typeof data === "string") {
        const lines = data.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              content += parsed.choices?.[0]?.delta?.content || "";
            } catch {}
          }
        }
      } else {
        content = data?.choices?.[0]?.message?.content || "";
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedFeedback = JSON.parse(jsonMatch[0]);
        setFeedback(parsedFeedback);
        
        // Track activity
        const activity = JSON.parse(localStorage.getItem("studybuddy_activity") || "{}");
        activity.essaysSubmitted = (activity.essaysSubmitted || 0) + 1;
        localStorage.setItem("studybuddy_activity", JSON.stringify(activity));
        
        toast.success("Essay graded!");
      } else {
        throw new Error("Could not parse feedback");
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
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 80) return "text-blue-500";
    if (score >= 70) return "text-yellow-500";
    return "text-orange-500";
  };

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
        <TopicSelector />
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
          {/* Overall Score */}
          <Card className="text-center p-8">
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(feedback.overallScore)}`}>
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
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                  Areas to Improve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.improvements.map((i, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-orange-500 mt-1">•</span>
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
