import { useState } from "react";
import { ClipboardList, CheckCircle, XCircle, Loader2, Trophy, Volume2, VolumeX, History, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopicSelector } from "@/components/TopicSelector";
import { MaterialSelector } from "@/components/MaterialSelector";
import { useTopic } from "@/contexts/TopicContext";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import { useQuizHistory } from "@/hooks/useQuizHistory";
import { HistoryPanel } from "@/components/HistoryPanel";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizState {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, number>;
  isSubmitted: boolean;
  score: number;
  sessionId?: string;
}

interface SelectedMaterial {
  id: string;
  name: string;
  type: string;
  base64: string;
}

export default function Quizzes() {
  const { currentTopic } = useTopic();
  const { gradeLevel } = useUser();
  const { user, profile } = useAuth();
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const { speak, stop, isSpeaking } = useSpeech();

  const [count, setCount] = useState<string>("5");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [showMaterials, setShowMaterials] = useState(false);

  const {
    sessions,
    saveSession,
    loadSession,
    deleteSession,
  } = useQuizHistory();

  const effectiveGradeLevel = profile?.grade_level || gradeLevel;

  const generateQuiz = async () => {
    if (!currentTopic && selectedMaterials.length === 0) {
      toast.error("Please select a topic or study material");
      return;
    }

    setIsGenerating(true);
    try {
      let data, error;

      if (selectedMaterials.length > 0) {
        const result = await supabase.functions.invoke("process-file", {
          body: {
            type: "quiz",
            fileData: selectedMaterials[0].base64,
            fileType: selectedMaterials[0].type,
            topic: currentTopic?.name,
            gradeLevel: effectiveGradeLevel,
            count: parseInt(count),
            difficulty,
          },
        });
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase.functions.invoke("generate-content", {
          body: {
            type: "quiz",
            topic: currentTopic?.name,
            gradeLevel: effectiveGradeLevel,
            count: parseInt(count),
            difficulty,
          },
        });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (data?.questions) {
        const formattedQuestions = data.questions.map((q: any, idx: number) => ({
          id: `q-${idx}`,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        }));

        setQuiz({
          questions: formattedQuestions,
          currentIndex: 0,
          answers: {},
          isSubmitted: false,
          score: 0,
        });
        setSelectedAnswer(null);
        toast.success(`Generated ${formattedQuestions.length} ${difficulty} questions!`);
      } else {
        throw new Error("No questions generated");
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (!quiz || quiz.isSubmitted) return;
    setSelectedAnswer(answerIndex);
  };

  const handleNext = async () => {
    if (!quiz || selectedAnswer === null) return;

    const newAnswers = {
      ...quiz.answers,
      [quiz.questions[quiz.currentIndex].id]: selectedAnswer,
    };

    if (quiz.currentIndex < quiz.questions.length - 1) {
      setQuiz({
        ...quiz,
        currentIndex: quiz.currentIndex + 1,
        answers: newAnswers,
      });
      setSelectedAnswer(null);
    } else {
      let score = 0;
      quiz.questions.forEach((q) => {
        if (newAnswers[q.id] === q.correctAnswer) score++;
      });

      const scorePercent = Math.round((score / quiz.questions.length) * 100);

      setQuiz({
        ...quiz,
        answers: newAnswers,
        isSubmitted: true,
        score,
      });

      if (user && (currentTopic || selectedMaterials.length > 0)) {
        await saveSession(
          currentTopic?.name || selectedMaterials[0]?.name || "Quiz",
          quiz.questions,
          newAnswers,
          scorePercent,
          true
        );
      }

      const activity = JSON.parse(localStorage.getItem("toki_activity") || "{}");
      activity.quizzesCompleted = (activity.quizzesCompleted || 0) + 1;
      localStorage.setItem("toki_activity", JSON.stringify(activity));
    }
  };

  const handleSpeakQuestion = () => {
    const currentQuestion = quiz?.questions[quiz.currentIndex];
    if (!currentQuestion) return;

    if (isSpeaking) {
      stop();
    } else {
      const text = `${currentQuestion.question}. Option A: ${currentQuestion.options[0]}. Option B: ${currentQuestion.options[1]}. Option C: ${currentQuestion.options[2]}. Option D: ${currentQuestion.options[3]}.`;
      speak(text);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const session = loadSession(sessionId);
    if (session) {
      setQuiz({
        questions: session.questions,
        currentIndex: session.is_completed ? 0 : Object.keys(session.answers).length,
        answers: session.answers,
        isSubmitted: session.is_completed,
        score: session.score ? Math.round((session.score / 100) * session.questions.length) : 0,
        sessionId: session.id,
      });
      setSelectedAnswer(null);
      toast.success(`Loaded "${session.topic}" quiz`);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const success = await deleteSession(sessionId);
    if (success) {
      toast.success("Quiz deleted");
    } else {
      toast.error("Failed to delete quiz");
    }
  };

  const handleReset = () => {
    setQuiz(null);
    setSelectedMaterials([]);
    setSelectedAnswer(null);
  };

  const currentQuestion = quiz?.questions[quiz.currentIndex];
  const progress = quiz ? ((quiz.currentIndex + 1) / quiz.questions.length) * 100 : 0;

  const historyItems = sessions.map((s) => ({
    id: s.id,
    title: s.topic,
    subtitle: s.is_completed ? "Completed" : "In Progress",
    date: s.updated_at,
    score: s.score || undefined,
  }));

  const canGenerate = currentTopic || selectedMaterials.length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            Quizzes
          </h1>
          <p className="text-muted-foreground">
            Test your knowledge with customized quizzes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HistoryPanel
            quizSessions={historyItems}
            onSelectQuiz={handleSelectSession}
            onDeleteQuiz={handleDeleteSession}
            activeTab="quizzes"
          />
          <TopicSelector />
        </div>
      </div>

      {!quiz && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="count">Number of Questions</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger className="w-[140px]" id="count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 questions</SelectItem>
                  <SelectItem value="5">5 questions</SelectItem>
                  <SelectItem value="10">10 questions</SelectItem>
                  <SelectItem value="15">15 questions</SelectItem>
                  <SelectItem value="20">20 questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-[120px]" id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowMaterials(!showMaterials)}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              {selectedMaterials.length > 0 ? selectedMaterials[0].name : "Select Material"}
            </Button>
          </div>

          <Collapsible open={showMaterials}>
            <CollapsibleContent className="pt-4 border-t">
              <MaterialSelector
                selectedIds={selectedMaterials.map((m) => m.id)}
                onSelect={setSelectedMaterials}
                maxSelection={1}
              />
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {!quiz && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={generateQuiz}
            disabled={isGenerating || !canGenerate}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              <>
                <ClipboardList className="h-5 w-5" />
                Generate {count} {difficulty} Questions
              </>
            )}
          </Button>
        </div>
      )}

      {quiz && !quiz.isSubmitted && currentQuestion && (
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Question {quiz.currentIndex + 1} of {quiz.questions.length}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSpeakQuestion}
                    className={cn("h-8 w-8", isSpeaking && "bg-primary text-primary-foreground")}
                  >
                    {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <h3 className="text-xl font-medium">{currentQuestion.question}</h3>

            <RadioGroup
              value={selectedAnswer?.toString()}
              onValueChange={(val) => handleAnswer(parseInt(val))}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors",
                    selectedAnswer === idx
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => handleAnswer(idx)}
                >
                  <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="cursor-pointer flex-1">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={selectedAnswer === null}>
                {quiz.currentIndex < quiz.questions.length - 1 ? "Next" : "Submit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {quiz?.isSubmitted && (
        <div className="space-y-6">
          <Card className="text-center p-8">
            <Trophy className={cn(
              "h-16 w-16 mx-auto mb-4",
              quiz.score >= quiz.questions.length * 0.8 ? "text-primary" : "text-muted-foreground"
            )} />
            <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-4xl font-bold text-primary mb-2">
              {quiz.score} / {quiz.questions.length}
            </p>
            <p className="text-muted-foreground">
              {quiz.score === quiz.questions.length
                ? "Perfect score!"
                : quiz.score >= quiz.questions.length * 0.8
                ? "Great job!"
                : quiz.score >= quiz.questions.length * 0.6
                ? "Good effort! Keep practicing."
                : "Keep studying, you'll improve!"}
            </p>
            <Button onClick={handleReset} className="mt-6">
              Try Another Quiz
            </Button>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Review Answers</h3>
            {quiz.questions.map((q) => {
              const userAnswer = quiz.answers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;

              return (
                <Card key={q.id} className={cn(
                  "border-l-4",
                  isCorrect ? "border-l-primary" : "border-l-destructive"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-2">
                        <p className="font-medium">{q.question}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Your answer: </span>
                          <span className={isCorrect ? "text-primary" : "text-destructive"}>
                            {q.options[userAnswer]}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="text-primary">{q.options[q.correctAnswer]}</span>
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">{q.explanation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!quiz && !isGenerating && (
        <Card className="p-12 text-center">
          <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Quiz Yet</h3>
          <p className="text-muted-foreground mb-4">
            Select a topic or study material, choose your settings, and generate a quiz.
          </p>
          {sessions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Or click the <History className="h-4 w-4 inline" /> button to review past quizzes.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
