import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  variant?: "default" | "compact" | "wide";
}

export function SkeletonCard({ className, variant = "default" }: SkeletonCardProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-xl bg-card p-4 border border-border/50",
          "animate-pulse",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-2 w-1/2 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "wide") {
    return (
      <div
        className={cn(
          "rounded-2xl bg-card p-6 border border-border/50",
          "animate-pulse",
          className
        )}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-1/3 rounded bg-muted" />
            <div className="h-8 w-20 rounded-full bg-muted" />
          </div>
          <div className="h-24 rounded-xl bg-muted" />
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-full bg-muted" />
            <div className="h-8 w-24 rounded-full bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-card p-6 border border-border/50",
        "animate-pulse",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-3 rounded bg-muted" />
        <div className="h-3 w-5/6 rounded bg-muted" />
      </div>
    </div>
  );
}
