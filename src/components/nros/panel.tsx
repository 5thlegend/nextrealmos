import * as React from "react";
import { cn } from "@/lib/utils";

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  scanlines?: boolean;
}

export function Panel({ eyebrow, title, action, scanlines, className, children, ...rest }: PanelProps) {
  return (
    <section className={cn("nros-deck relative overflow-hidden", className)} {...rest}>
      {scanlines && <div className="pointer-events-none absolute inset-0 nros-scanlines opacity-40" />}
      {(eyebrow || title || action) && (
        <header className="flex items-end justify-between gap-4 px-5 pt-4">
          <div className="space-y-1">
            {eyebrow && <p className="nros-eyebrow">{eyebrow}</p>}
            {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {(eyebrow || title || action) && <div className="nros-divider mx-5 my-3" />}
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}
