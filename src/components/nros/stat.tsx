import * as React from "react";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: "up" | "down" | "flat";
  className?: string;
}) {
  return (
    <div className={cn("nros-deck p-4", className)}>
      <p className="nros-eyebrow">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {trend && (
          <span
            className={cn(
              "font-mono text-[10px]",
              trend === "up" && "text-primary",
              trend === "down" && "text-destructive",
              trend === "flat" && "text-muted-foreground",
            )}
          >
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
