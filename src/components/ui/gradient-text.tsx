import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "success" | "warning" | "info";
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p";
}

const gradients = {
  primary: "from-violet-600 via-purple-600 to-indigo-600",
  success: "from-emerald-500 via-green-500 to-teal-500",
  warning: "from-amber-500 via-orange-500 to-red-500",
  info: "from-blue-500 via-cyan-500 to-teal-500",
};

export function GradientText({ 
  children, 
  className, 
  variant = "primary",
  as: Component = "span"
}: GradientTextProps) {
  return (
    <Component
      className={cn(
        "bg-gradient-to-r bg-clip-text text-transparent",
        "font-bold tracking-tight",
        gradients[variant],
        className
      )}
    >
      {children}
    </Component>
  );
}
