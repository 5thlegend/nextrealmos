"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";

/**
 * Post-result lead capture. Frames the email ask as "send me the
 * upgrade pack" — value-led, not "sign up for the newsletter."
 */
export function AuraLeadCapture({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || done) return;
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim())) {
      setError("Enter a valid email"); return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/aura/lead", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, email: email.trim() }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error ?? "send failed");
        }
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "send failed");
      }
    });
  };

  if (done) {
    return (
      <div className="nr-card p-6 text-center">
        <div className="inline-flex items-center gap-2 nr-gold">
          <Check className="h-4 w-4" />
          <p className="nr-eyebrow nr-gold">— upgrade pack incoming</p>
        </div>
        <p className="nr-display text-2xl mt-3" style={{ color: "hsl(var(--nr-text))" }}>
          You&apos;re in. Watch your inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="nr-card p-6">
      <p className="nr-eyebrow mb-2">— take the upgrade pack</p>
      <h3 className="nr-display text-2xl mb-1" style={{ color: "hsl(var(--nr-text))" }}>
        Your scan + the playbook to <span className="nr-magma italic">close the gap</span>.
      </h3>
      <p className="text-sm mb-4" style={{ color: "hsl(var(--nr-muted))" }}>
        We&apos;ll send the full breakdown + a 7-day execution sequence. No spam. One email.
      </p>
      <form onSubmit={submit} className="flex items-stretch gap-0 rounded-sm overflow-hidden border"
            style={{ borderColor: "hsla(var(--nr-text), 0.16)" }}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className="flex-1 bg-transparent px-4 py-3 outline-none text-sm"
          style={{ color: "hsl(var(--nr-text))" }}
          autoComplete="email"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-5 flex items-center gap-2 transition-colors disabled:opacity-50"
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
          {pending ? "sending…" : "send it"}
          {!pending && <ArrowRight className="h-3 w-3" />}
        </button>
      </form>
      {error && <p className="font-mono text-[11px] nr-magma mt-2">// {error}</p>}
    </div>
  );
}
