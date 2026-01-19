import { Volume2, VolumeX } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function VoiceToggle() {
  const { voiceEnabled, setVoiceEnabled } = useUser();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={voiceEnabled ? "default" : "ghost"}
          size="icon"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className="rounded-full"
          aria-label={voiceEnabled ? "Turn off voice" : "Turn on voice"}
        >
          {voiceEnabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {voiceEnabled ? "Voice is on - I'll read responses aloud" : "Voice is off - Click to hear responses"}
      </TooltipContent>
    </Tooltip>
  );
}
