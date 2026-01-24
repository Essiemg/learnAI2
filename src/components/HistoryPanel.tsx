import { useState } from "react";
import { History, Trash2, MessageSquare, Layers, ClipboardList, FileText, ChevronRight, Phone, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  score?: number;
  duration?: string;
}

interface HistoryPanelProps {
  chatSessions?: HistoryItem[];
  voiceSessions?: HistoryItem[];
  flashcardSessions?: HistoryItem[];
  quizSessions?: HistoryItem[];
  essaySubmissions?: HistoryItem[];
  onSelectChat?: (id: string) => void;
  onSelectVoice?: (id: string) => void;
  onPlayVoiceRecap?: (id: string) => void;
  onSelectFlashcard?: (id: string) => void;
  onSelectQuiz?: (id: string) => void;
  onSelectEssay?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  onDeleteVoice?: (id: string) => void;
  onDeleteFlashcard?: (id: string) => void;
  onDeleteQuiz?: (id: string) => void;
  onDeleteEssay?: (id: string) => void;
  activeTab?: string;
}

function HistoryItemCard({
  item,
  icon: Icon,
  onSelect,
  onDelete,
  onPlayRecap,
}: {
  item: HistoryItem;
  icon: React.ElementType;
  onSelect?: () => void;
  onDelete?: () => void;
  onPlayRecap?: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors",
        onSelect && "cursor-pointer"
      )}
      onClick={onSelect}
    >
      <div className="shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {item.duration && <span className="mr-2">{item.duration}</span>}
          {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
        </p>
      </div>
      {item.score !== undefined && (
        <div
          className={cn(
            "shrink-0 text-sm font-bold",
            item.score >= 80 ? "text-primary" : item.score >= 60 ? "text-accent-foreground" : "text-destructive"
          )}
        >
          {item.score}%
        </div>
      )}
      {onPlayRecap && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onPlayRecap();
          }}
          title="Play audio recap"
        >
          <Volume2 className="h-4 w-4 text-primary" />
        </Button>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

export function HistoryPanel({
  chatSessions = [],
  voiceSessions = [],
  flashcardSessions = [],
  quizSessions = [],
  essaySubmissions = [],
  onSelectChat,
  onSelectVoice,
  onPlayVoiceRecap,
  onSelectFlashcard,
  onSelectQuiz,
  onSelectEssay,
  onDeleteChat,
  onDeleteVoice,
  onDeleteFlashcard,
  onDeleteQuiz,
  onDeleteEssay,
  activeTab = "chats",
}: HistoryPanelProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (callback?: (id: string) => void, id?: string) => {
    if (callback && id) {
      callback(id);
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <History className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>History</SheetTitle>
          <SheetDescription>
            View and continue your past study sessions
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue={activeTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chats" className="text-xs" title="Text Chats">
              <MessageSquare className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="voice" className="text-xs" title="Voice Calls">
              <Phone className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="text-xs" title="Flashcards">
              <Layers className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="text-xs" title="Quizzes">
              <ClipboardList className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="essays" className="text-xs" title="Essays">
              <FileText className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="mt-4">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-2 pr-4">
                {chatSessions.length === 0 ? (
                  <EmptyState message="No chat history yet" />
                ) : (
                  chatSessions.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      icon={MessageSquare}
                      onSelect={() => handleSelect(onSelectChat, item.id)}
                      onDelete={onDeleteChat ? () => onDeleteChat(item.id) : undefined}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="voice" className="mt-4">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-2 pr-4">
                {voiceSessions.length === 0 ? (
                  <EmptyState message="No voice conversations yet" />
                ) : (
                  voiceSessions.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      icon={Phone}
                      onSelect={() => handleSelect(onSelectVoice, item.id)}
                      onDelete={onDeleteVoice ? () => onDeleteVoice(item.id) : undefined}
                      onPlayRecap={onPlayVoiceRecap ? () => onPlayVoiceRecap(item.id) : undefined}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="flashcards" className="mt-4">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-2 pr-4">
                {flashcardSessions.length === 0 ? (
                  <EmptyState message="No flashcard sessions yet" />
                ) : (
                  flashcardSessions.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      icon={Layers}
                      onSelect={() => handleSelect(onSelectFlashcard, item.id)}
                      onDelete={onDeleteFlashcard ? () => onDeleteFlashcard(item.id) : undefined}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="quizzes" className="mt-4">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-2 pr-4">
                {quizSessions.length === 0 ? (
                  <EmptyState message="No quiz history yet" />
                ) : (
                  quizSessions.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      icon={ClipboardList}
                      onSelect={() => handleSelect(onSelectQuiz, item.id)}
                      onDelete={onDeleteQuiz ? () => onDeleteQuiz(item.id) : undefined}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="essays" className="mt-4">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-2 pr-4">
                {essaySubmissions.length === 0 ? (
                  <EmptyState message="No essay submissions yet" />
                ) : (
                  essaySubmissions.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      icon={FileText}
                      onSelect={() => handleSelect(onSelectEssay, item.id)}
                      onDelete={onDeleteEssay ? () => onDeleteEssay(item.id) : undefined}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
