import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}

export function AnimatedCard({ 
  children, 
  className, 
  delay = 0,
  hover = true 
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={hover ? { 
        scale: 1.02, 
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)" 
      } : undefined}
      className={cn(
        "rounded-2xl bg-card p-6 border border-border/50",
        "transition-colors duration-300",
        "shadow-soft",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
