import { useState } from "react";
import { ClipboardList, CheckCircle, XCircle, Sparkles, Loader2, Trophy, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { TopicSelector } from "@/components/TopicSelector";
import { useTopic } from "@/contexts/TopicContext";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";

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
}

export default function Quizzes() {
  const { currentTopic } = useTopic();
  const { gradeLevel } = useUser();
  const { profile } = useAuth();
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const { speak, stop, isSpeaking } = useSpeech();

  const effectiveGradeLevel = profile?.grade_level || gradeLevel;

  const generateQuiz = async () => {
    if (!currentTopic) {
      toast.error("Please select a topic first");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          type: "quiz",
          topic: currentTopic.name,
          gradeLevel: effectiveGradeLevel,
          count: 5,
        },
      });

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
        toast.success("Quiz generated!");
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

  const handleNext = () => {
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
      // Calculate score
      let score = 0;
      quiz.questions.forEach((q) => {
        if (newAnswers[q.id] === q.correctAnswer) score++;
      });

      setQuiz({
        ...quiz,
        answers: newAnswers,
        isSubmitted: true,
        score,
      });

      // Track activity
      const activity = JSON.parse(localStorage.getItem("studybuddy_activity") || "{}");
      activity.quizzesCompleted = (activity.quizzesCompleted || 0) + 1;
      localStorage.setItem("studybuddy_activity", JSON.stringify(activity));
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

  const currentQuestion = quiz?.questions[quiz.currentIndex];
  const progress = quiz ? ((quiz.currentIndex + 1) / quiz.questions.length) * 100 : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            Quizzes
          </h1>
          <p className="text-muted-foreground">
            Test your knowledge with AI-generated quizzes
          </p>
        </div>
        <TopicSelector />
      </div>

      {/* Generate Button */}
      {!quiz && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={generateQuiz}
            disabled={isGenerating || !currentTopic}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate Quiz
                {currentTopic && ` on ${currentTopic.name}`}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Quiz Display */}
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

      {/* Results */}
      {quiz?.isSubmitted && (
        <div className="space-y-6">
          <Card className="text-center p-8">
            <Trophy className={cn(
              "h-16 w-16 mx-auto mb-4",
              quiz.score >= quiz.questions.length * 0.8 ? "text-yellow-500" : "text-muted-foreground"
            )} />
            <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-4xl font-bold text-primary mb-2">
              {quiz.score} / {quiz.questions.length}
            </p>
            <p className="text-muted-foreground">
              {quiz.score === quiz.questions.length
                ? "Perfect score! 🎉"
                : quiz.score >= quiz.questions.length * 0.8
                ? "Great job! 👏"
                : quiz.score >= quiz.questions.length * 0.6
                ? "Good effort! Keep practicing."
                : "Keep studying, you'll improve!"}
            </p>
            <Button onClick={() => setQuiz(null)} className="mt-6">
              Try Another Quiz
            </Button>
          </Card>

          {/* Review Answers */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Review Answers</h3>
            {quiz.questions.map((q) => {
              const userAnswer = quiz.answers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;
              
              return (
                <Card key={q.id} className={cn(
                  "border-l-4",
                  isCorrect ? "border-l-green-500" : "border-l-red-500"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-2">
                        <p className="font-medium">{q.question}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Your answer: </span>
                          <span className={isCorrect ? "text-green-600" : "text-red-600"}>
                            {q.options[userAnswer]}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="text-green-600">{q.options[q.correctAnswer]}</span>
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

      {/* Empty State */}
      {!quiz && !isGenerating && (
        <Card className="p-12 text-center">
          <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Quiz Yet</h3>
          <p className="text-muted-foreground mb-4">
            Select a topic and generate an AI-powered quiz to test your knowledge.
          </p>
        </Card>
      )}
    </div>
  );
}
