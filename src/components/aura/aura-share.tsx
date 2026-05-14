"use client";

import { useState } from "react";
import { Check, Copy, Twitter } from "lucide-react";

/**
 * Cinematic share row — copy-link button + X intent. The OG image
 * (/api/aura/og/[token].svg) is what renders in the embed.
 */
export function AuraShare({ token, score, host }: { token: string; score: number; host: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined"
    ? `https://nextrealmos.pages.dev/aura/scan/${token}`
    : `${window.location.origin}/aura/scan/${token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers — nothing to do, user can manually copy the URL shown
    }
  };

  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Just scanned ${host} — aura ${score}.\n\nFind out yours →`,
  )}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-stretch gap-2 max-w-xl mx-auto">
      <code
        className="flex-1 truncate font-mono text-[12px] px-4 py-3 rounded-sm border min-w-0"
        style={{
          borderColor: "hsla(var(--nr-text), 0.16)",
          background: "hsla(var(--nr-card), 0.6)",
          color: "hsl(var(--nr-text))",
        }}
        title={url}
      >
        {url.replace(/^https?:\/\//, "")}
      </code>
      <button
        type="button"
        onClick={copy}
        className="px-4 inline-flex items-center gap-2 rounded-sm border transition-colors shrink-0"
        style={{
          borderColor: "hsla(var(--nr-text), 0.16)",
          background: copied ? "hsla(var(--nr-gold), 0.1)" : "transparent",
          color: copied ? "hsl(var(--nr-gold))" : "hsl(var(--nr-text))",
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "11px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {copied ? <><Check className="h-3 w-3" /> copied</> : <><Copy className="h-3 w-3" /> copy</>}
      </button>
      <a
        href={tweet}
        target="_blank"
        rel="noreferrer"
        className="px-4 inline-flex items-center gap-2 rounded-sm shrink-0"
        style={{
          background: "hsl(var(--nr-magma))",
          color: "hsl(var(--nr-bg))",
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "11px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        <Twitter className="h-3 w-3" />
        post on x
      </a>
    </div>
  );
}
