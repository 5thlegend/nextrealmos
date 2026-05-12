"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction, type SignUpState } from "./actions";

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const search = useSearchParams();
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUpAction, {});
  const next = search.get("next") ?? "";

  return (
    <form action={action} className="w-full max-w-sm space-y-6">
      <header className="space-y-1">
        <p className="nros-eyebrow">// access · activation</p>
        <h2 className="text-2xl font-semibold tracking-tight">Activate Operator Identity</h2>
        <p className="text-sm text-muted-foreground">Forge your callsign. Receive INITIATE rank.</p>
      </header>

      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label htmlFor="callsign">Callsign</Label>
        <Input id="callsign" name="callsign" type="text" required minLength={3} maxLength={24} placeholder="e.g. SHADOW.SEVEN" />
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

      <Button type="submit" className="w-full" disabled={pending}>
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
