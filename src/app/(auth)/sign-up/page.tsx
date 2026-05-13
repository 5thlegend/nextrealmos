"use client";

import { Suspense, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction, type SignUpState } from "./actions";
import { cn } from "@/lib/utils";

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

type CheckState = {
  checking: boolean;
  available: boolean | null;
  taken_by_realm: string | null;
  suggestions: string[];
};

function SignUpForm() {
  const search = useSearchParams();
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUpAction, {});
  const next = search.get("next") ?? "";
  const [callsign, setCallsign] = useState("");
  const [check, setCheck] = useState<CheckState>({
    checking: false, available: null, taken_by_realm: null, suggestions: [],
  });

  // Debounced federation-wide availability check.
  useEffect(() => {
    if (callsign.length < 2) {
      setCheck({ checking: false, available: null, taken_by_realm: null, suggestions: [] });
      return;
    }
    setCheck((c) => ({ ...c, checking: true }));
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/federation/operators/check?callsign=${encodeURIComponent(callsign)}`);
        if (r.ok) {
          const data = await r.json();
          setCheck({
            checking: false,
            available: !!data.available,
            taken_by_realm: data.taken_by_realm ?? null,
            suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
          });
        } else {
          setCheck({ checking: false, available: null, taken_by_realm: null, suggestions: [] });
        }
      } catch {
        setCheck({ checking: false, available: null, taken_by_realm: null, suggestions: [] });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [callsign]);

  const status =
    callsign.length < 2 ? "" :
    check.checking ? "checking" :
    check.available === true ? "available" :
    check.available === false ? "taken" : "";

  return (
    <form action={action} className="w-full max-w-sm space-y-6">
      <header className="space-y-1">
        <p className="nros-eyebrow">// access · activation</p>
        <h2 className="text-2xl font-semibold tracking-tight">Activate Operator Identity</h2>
        <p className="text-sm text-muted-foreground">Forge your callsign. Receive INITIATE rank. Callsigns are federation-wide unique.</p>
      </header>

      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label htmlFor="callsign">Callsign · federation-wide</Label>
        <div className="relative">
          <Input
            id="callsign"
            name="callsign"
            type="text"
            required
            minLength={2}
            maxLength={24}
            placeholder="e.g. SHADOW.SEVEN"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value)}
            className={cn(
              "pr-24",
              status === "taken" && "border-destructive focus-visible:ring-destructive",
              status === "available" && "border-primary/60",
            )}
          />
          {status && (
            <span
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.18em]",
                status === "checking"  && "text-muted-foreground",
                status === "available" && "text-primary",
                status === "taken"     && "text-destructive",
              )}
            >
              {status}
            </span>
          )}
        </div>
        {status === "taken" && (
          <div className="text-[11px] text-destructive font-mono">
            // already claimed{check.taken_by_realm ? <span> by /{check.taken_by_realm}</span> : null} in the federation
            {check.suggestions.length > 0 && (
              <span>
                {" "}— try{" "}
                {check.suggestions.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCallsign(s)}
                    className="text-primary hover:underline mr-2"
                  >
                    {s}
                  </button>
                ))}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>

      {state.error && <p className="text-xs text-destructive font-mono">// {state.error}</p>}

      <Button type="submit" className="w-full" disabled={pending || check.available === false}>
        {pending ? "Forging…" : "Activate"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Already an operator?{" "}
        <Link
          href={`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-primary hover:underline"
        >
          Sign in
        </Link>.
      </p>
    </form>
  );
}
