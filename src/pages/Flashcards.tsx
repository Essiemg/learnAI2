import { useState, useEffect } from "react";
import { Layers, Shuffle, ChevronLeft, ChevronRight, RotateCcw, Loader2, Volume2, VolumeX, History, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TopicSelector } from "@/components/TopicSelector";
import { MaterialSelector } from "@/components/MaterialSelector";
import { useTopic } from "@/contexts/TopicContext";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSpeech } from "@/hooks/useSpeech";
import { useFlashcardHistory } from "@/hooks/useFlashcardHistory";
import { HistoryPanel } from "@/components/HistoryPanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface SelectedMaterial {
  id: string;
  name: string;
  type: string;
  base64: string;
}

export default function Flashcards() {
  const { currentTopic } = useTopic();
  const { gradeLevel } = useUser();
  const { user, profile } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSessionTopic, setCurrentSessionTopic] = useState<string | null>(null);
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
  } = useFlashcardHistory();

  const effectiveGradeLevel = profile?.grade_level || gradeLevel;

  useEffect(() => {
    if (user && cards.length > 0 && currentSessionTopic) {
      const timeoutId = setTimeout(() => {
        saveSession(currentSessionTopic, cards, currentIndex);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [cards, currentIndex, currentSessionTopic, user, saveSession]);

  const generateFlashcards = async () => {
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
            type: "flashcards",
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
            type: "flashcards",
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

      if (data?.flashcards) {
        const formattedCards = data.flashcards.map((card: any, idx: number) => ({
          id: `card-${idx}`,
          front: card.front,
          back: card.back,
        }));
        setCards(formattedCards);
        setCurrentIndex(0);
        setIsFlipped(false);
        setCurrentSessionTopic(currentTopic?.name || selectedMaterials[0]?.name || "Study Material");

        const activity = JSON.parse(localStorage.getItem("studybuddy_activity") || "{}");
        activity.flashcardsStudied = (activity.flashcardsStudied || 0) + formattedCards.length;
        localStorage.setItem("studybuddy_activity", JSON.stringify(activity));

        toast.success(`Generated ${formattedCards.length} ${difficulty} flashcards!`);
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

  const handleSelectSession = (sessionId: string) => {
    const session = loadSession(sessionId);
    if (session) {
      setCards(session.cards);
      setCurrentIndex(session.current_index);
      setCurrentSessionTopic(session.topic);
      setIsFlipped(false);
      toast.success(`Loaded "${session.topic}" flashcards`);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const success = await deleteSession(sessionId);
    if (success) {
      toast.success("Session deleted");
    } else {
      toast.error("Failed to delete session");
    }
  };

  const handleReset = () => {
    setCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCurrentSessionTopic(null);
    setSelectedMaterials([]);
  };

  const currentCard = cards[currentIndex];

  const historyItems = sessions.map((s) => ({
    id: s.id,
    title: s.topic,
    subtitle: `${s.cards.length} cards`,
    date: s.updated_at,
  }));

  const canGenerate = currentTopic || selectedMaterials.length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" />
            Flashcards
          </h1>
          <p className="text-muted-foreground">
            Generate flashcards from topics or study materials
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HistoryPanel
            flashcardSessions={historyItems}
            onSelectFlashcard={handleSelectSession}
            onDeleteFlashcard={handleDeleteSession}
            activeTab="flashcards"
          />
          <TopicSelector />
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="count">Number of Cards</Label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger className="w-[120px]" id="count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 cards</SelectItem>
                <SelectItem value="5">5 cards</SelectItem>
                <SelectItem value="10">10 cards</SelectItem>
                <SelectItem value="15">15 cards</SelectItem>
                <SelectItem value="20">20 cards</SelectItem>
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

      <div className="flex justify-center gap-2">
        <Button
          size="lg"
          onClick={generateFlashcards}
          disabled={isGenerating || !canGenerate}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Layers className="h-5 w-5" />
              Generate {count} {difficulty} Flashcards
            </>
          )}
        </Button>
      </div>

      {currentSessionTopic && cards.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4" />
          Studying: {currentSessionTopic}
        </div>
      )}

      {cards.length > 0 && currentCard && (
        <div className="space-y-6">
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
            <Button variant="outline" size="icon" onClick={handleReset}>
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {cards.length === 0 && !isGenerating && (
        <Card className="p-12 text-center">
          <Layers className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Flashcards Yet</h3>
          <p className="text-muted-foreground mb-4">
            Select a topic or study material, then choose your settings and generate flashcards.
          </p>
          {sessions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Or click the <History className="h-4 w-4 inline" /> button to continue a previous session.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
