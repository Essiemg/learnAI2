import { useState } from "react";
import { Layers, Shuffle, ChevronLeft, ChevronRight, RotateCcw, Sparkles, Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TopicSelector } from "@/components/TopicSelector";
import { useTopic } from "@/contexts/TopicContext";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSpeech } from "@/hooks/useSpeech";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export default function Flashcards() {
  const { currentTopic } = useTopic();
  const { gradeLevel } = useUser();
  const { profile, role } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { speak, stop, isSpeaking } = useSpeech();

  const effectiveGradeLevel = profile?.grade_level || gradeLevel;

  const generateFlashcards = async () => {
    if (!currentTopic) {
      toast.error("Please select a topic first");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          type: "flashcards",
          topic: currentTopic.name,
          gradeLevel: effectiveGradeLevel,
          count: 5,
        },
      });

      if (error) throw error;

      if (data?.flashcards) {
        const formattedCards = data.flashcards.map((card: any, idx: number) => ({
          id: `card-${idx}`,
          front: card.front,
          back: card.back,
        }));
        setCards(formattedCards);
        setCurrentIndex(0);
        setIsFlipped(false);
        
        // Track activity
        const activity = JSON.parse(localStorage.getItem("studybuddy_activity") || "{}");
        activity.flashcardsStudied = (activity.flashcardsStudied || 0) + formattedCards.length;
        localStorage.setItem("studybuddy_activity", JSON.stringify(activity));
        
        toast.success(`Generated ${formattedCards.length} flashcards!`);
      } else {
        throw new Error("No flashcards generated");
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      toast.error("Failed to generate flashcards. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1));
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
  };

  const handleShuffle = () => {
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleSpeak = () => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;
    
    if (isSpeaking) {
      stop();
    } else {
      const text = isFlipped ? currentCard.back : currentCard.front;
      speak(text);
    }
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" />
            Flashcards
          </h1>
          <p className="text-muted-foreground">
            AI-generated flashcards to help you study
          </p>
        </div>
        <TopicSelector />
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={generateFlashcards}
          disabled={isGenerating || !currentTopic}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate Flashcards
              {currentTopic && ` for ${currentTopic.name}`}
            </>
          )}
        </Button>
      </div>

      {/* Flashcard Display */}
      {cards.length > 0 && currentCard && (
        <div className="space-y-6">
          {/* Card */}
          <div className="perspective-1000">
            <div
              className={cn(
                "relative w-full h-64 cursor-pointer transition-transform duration-500 transform-style-preserve-3d",
                isFlipped && "rotate-y-180"
              )}
              onClick={() => setIsFlipped(!isFlipped)}
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0)",
              }}
            >
              {/* Front */}
              <Card
                className="absolute inset-0 backface-hidden"
                style={{ backfaceVisibility: "hidden" }}
              >
                <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-xs text-muted-foreground mb-4">QUESTION</p>
                  <p className="text-xl font-medium">{currentCard.front}</p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Click to flip
                  </p>
                </CardContent>
              </Card>

              {/* Back */}
              <Card
                className="absolute inset-0 backface-hidden bg-primary text-primary-foreground"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-xs opacity-70 mb-4">ANSWER</p>
                  <p className="text-xl font-medium">{currentCard.back}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              {currentIndex + 1} / {cards.length}
            </span>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShuffle}>
              <Shuffle className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleSpeak}
              className={cn(isSpeaking && "bg-primary text-primary-foreground")}
            >
              {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCards([])}>
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {cards.length === 0 && !isGenerating && (
        <Card className="p-12 text-center">
          <Layers className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Flashcards Yet</h3>
          <p className="text-muted-foreground mb-4">
            Select a topic and generate AI-powered flashcards to start studying.
          </p>
        </Card>
      )}
    </div>
  );
}
