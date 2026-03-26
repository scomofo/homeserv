import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse-warm",
        className
      )}
    />
  );
}
