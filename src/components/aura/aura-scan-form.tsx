"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * The viral acquisition form. Single input, instant motion.
 * Per the directive: 1-second comprehension; the scan animation is the
 * "motion that provokes 'why don't they have that'."
 */
export function AuraScanForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"idle" | "fetching" | "analyzing" | "scoring">("idle");

  const cinematicWait = async () => {
    // Multi-phase loading text — feels like a real instrument sequencing.
    // Total ~1.6s of visible motion before redirect; actual scan can take longer.
    const stages: Array<{ key: typeof phase; ms: number }> = [
      { key: "fetching",  ms: 600 },
      { key: "analyzing", ms: 700 },
      { key: "scoring",   ms: 500 },
    ];
    for (const s of stages) {
      setPhase(s.key);
      await new Promise((r) => setTimeout(r, s.ms));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const trimmed = url.trim();
    if (!trimmed) { setError("Paste a URL"); return; }
    setError(null);
    startTransition(async () => {
      try {
        // Fire scan + cinematic loader in parallel; the scan usually
        // finishes during or shortly after the loader completes.
        const [resp] = await Promise.all([
          fetch("/api/aura/scan", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: trimmed }),
          }),
          cinematicWait(),
        ]);
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data?.error ?? "scan failed");
        }
        const data = await resp.json();
        router.push(`/aura/scan/${data.token}`);
      } catch (err) {
        setPhase("idle");
        setError(err instanceof Error ? err.message : "scan failed");
      }
    });
  };

  const phaseLabel: Record<typeof phase, string> = {
    idle:       "",
    fetching:   "fetching page",
    analyzing:  "reading content",
    scoring:    "scoring aura",
  };

  return (
    <form id="scan" onSubmit={submit} className="space-y-3">
      <div
        className="relative rounded-sm border overflow-hidden transition-all"
        style={{
          borderColor: pending ? "hsla(var(--nr-magma), 0.6)" : "hsla(var(--nr-text), 0.16)",
          background:  "hsla(var(--nr-card), 0.7)",
          backdropFilter: "blur(14px)",
          boxShadow: pending ? "0 0 32px -10px hsla(var(--nr-magma), 0.5)" : "none",
        }}
      >
        {/* The scanning bar — cinematic motion */}
        {pending && (
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, hsl(var(--nr-magma)), transparent)",
              animation: "aurascan 1.4s linear infinite",
            }}
          />
        )}

        <div className="flex items-stretch">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={pending}
            placeholder="https://yourstartup.com   or   yourstartup.com"
            className="flex-1 bg-transparent px-5 py-5 text-base outline-none disabled:opacity-60"
            style={{ color: "hsl(var(--nr-text))", fontFamily: "var(--font-inter), sans-serif" }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={pending || !url.trim()}
            className="px-6 flex items-center gap-2 transition-colors disabled:opacity-50"
            style={{
              background: pending ? "hsla(var(--nr-magma), 0.2)" : "hsl(var(--nr-magma))",
              color:      pending ? "hsl(var(--nr-magma))" : "hsl(var(--nr-bg))",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize:   "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {pending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>scan</span>
              </>
            ) : (
              <>
                <span>scan aura</span>
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </button>
        </div>

        {/* Phase indicator strip */}
        {pending && (
          <div
            className="border-t px-5 py-2 text-[11px] font-mono uppercase tracking-[0.18em] flex items-center gap-2"
            style={{ borderColor: "hsla(var(--nr-text), 0.08)", color: "hsl(var(--nr-magma))" }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ background: "hsl(var(--nr-magma))" }} />
            {phaseLabel[phase]}
          </div>
        )}
      </div>

      {error && (
        <p className="font-mono text-[11px] nr-magma">// {error}</p>
      )}

      <style>{`
        @keyframes aurascan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </form>
  );
}
