import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingVoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  onClick: () => void;
  className?: string;
}

export function FloatingVoiceButton({
  isListening,
  isProcessing,
  onClick,
  className,
}: FloatingVoiceButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "h-16 w-16 rounded-full",
        "flex items-center justify-center",
        "shadow-lg",
        "transition-all duration-300",
        isListening
          ? "bg-gradient-to-r from-red-500 to-pink-500 shadow-red-500/25"
          : "bg-gradient-to-r from-violet-600 to-purple-600 shadow-violet-500/25",
        className
      )}
    >
      {/* Ripple effect when listening */}
      <AnimatePresence>
        {isListening && (
          <>
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeOut",
                }}
                className={cn(
                  "absolute inset-0 rounded-full",
                  isListening ? "bg-red-500" : "bg-violet-500"
                )}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Icon */}
      <div className="relative z-10 text-white">
        {isProcessing ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-7 w-7" />
        ) : (
          <Mic className="h-7 w-7" />
        )}
      </div>
    </motion.button>
  );
}
