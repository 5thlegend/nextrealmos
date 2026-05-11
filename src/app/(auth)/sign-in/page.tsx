"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, type SignInState } from "./actions";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const search = useSearchParams();
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, {});

  return (
    <form action={action} className="w-full max-w-sm space-y-6">
      <header className="space-y-1">
        <p className="nros-eyebrow">// access · session</p>
        <h2 className="text-2xl font-semibold tracking-tight">Resume Operator Session</h2>
        <p className="text-sm text-muted-foreground">Authenticate against the kernel.</p>
      </header>

      <input type="hidden" name="next" value={search.get("next") ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
      </div>

      {state.error && <p className="text-xs text-destructive font-mono">// {state.error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Authenticating…" : "Engage"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        No identity yet?{" "}
        <Link href="/sign-up" className="text-primary hover:underline">Activate operator</Link>.
      </p>
    </form>
  );
}
