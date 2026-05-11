import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/40 bg-primary/10 text-primary",
        outline: "border-border text-muted-foreground",
        accent:  "border-accent/40 bg-accent/10 text-accent",
        warn:    "border-nros-warn/40 bg-nros-warn/10 text-nros-warn",
        danger:  "border-destructive/40 bg-destructive/10 text-destructive",
        muted:   "border-border bg-secondary text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
