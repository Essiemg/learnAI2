import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Plus, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useTopic, Topic } from "@/contexts/TopicContext";
import { cn } from "@/lib/utils";

interface TopicSelectorProps {
  className?: string;
  placeholder?: string;
  showRecent?: boolean;
}

export function TopicSelector({
  className,
  placeholder = "Select a topic...",
  showRecent = true,
}: TopicSelectorProps) {
  const { topics, currentTopic, recentTopics, setCurrentTopic, addTopic, getTopicSuggestions } = useTopic();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = query ? getTopicSuggestions(query) : [];
  const groupedTopics = topics.reduce((acc, topic) => {
    const subject = topic.subject || "Other";
    if (!acc[subject]) acc[subject] = [];
    acc[subject].push(topic);
    return acc;
  }, {} as Record<string, Topic[]>);

  useEffect(() => {
    if (isAddingCustom && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingCustom]);

  const handleSelectTopic = (topic: Topic) => {
    setCurrentTopic(topic);
    setOpen(false);
    setQuery("");
  };

  const handleAddCustom = () => {
    if (customTopic.trim()) {
      const newTopic = addTopic(customTopic.trim());
      setCurrentTopic(newTopic);
      setCustomTopic("");
      setIsAddingCustom(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between min-w-[200px] bg-card border-border",
            className
          )}
        >
          {currentTopic ? (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="truncate">{currentTopic.name}</span>
              {currentTopic.subject && (
                <Badge variant="secondary" className="text-xs">
                  {currentTopic.subject}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input
            placeholder="Search topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2">
          {/* Recent Topics */}
          {showRecent && recentTopics.length > 0 && !query && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                Recent
              </p>
              <div className="flex flex-wrap gap-1">
                {recentTopics.slice(0, 5).map((topic) => (
                  <Badge
                    key={topic.id}
                    variant={currentTopic?.id === topic.id ? "default" : "secondary"}
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => handleSelectTopic(topic)}
                  >
                    {topic.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {query && suggestions.length > 0 && (
            <div className="space-y-1">
              {suggestions.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleSelectTopic(topic)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-accent",
                    currentTopic?.id === topic.id && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{topic.name}</span>
                    {topic.subject && (
                      <span className="text-xs text-muted-foreground">
                        {topic.subject}
                      </span>
                    )}
                  </div>
                  {currentTopic?.id === topic.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* All Topics by Subject */}
          {!query && (
            <div className="space-y-3">
              {Object.entries(groupedTopics).map(([subject, subjectTopics]) => (
                <div key={subject}>
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                    {subject}
                  </p>
                  <div className="space-y-0.5">
                    {subjectTopics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleSelectTopic(topic)}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-accent",
                          currentTopic?.id === topic.id && "bg-accent"
                        )}
                      >
                        <span>{topic.name}</span>
                        {currentTopic?.id === topic.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {query && suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No topics found. Add a custom topic below.
            </p>
          )}
        </div>

        {/* Add Custom Topic */}
        <div className="border-t border-border p-2">
          {isAddingCustom ? (
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Enter custom topic..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                className="h-8 flex-1"
              />
              <Button size="sm" onClick={handleAddCustom} className="h-8">
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsAddingCustom(false)}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setIsAddingCustom(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add custom topic
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
