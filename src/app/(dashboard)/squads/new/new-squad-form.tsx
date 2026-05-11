"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSquadAction, type NewSquadState } from "./actions";

export function NewSquadForm() {
  const [state, action, pending] = useActionState<NewSquadState, FormData>(createSquadAction, {});
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Squad Name</Label>
        <Input id="name" name="name" required minLength={2} maxLength={48} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tag">Tag (2-8)</Label>
        <Input id="tag" name="tag" required minLength={2} maxLength={8} placeholder="VANGUARD" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="motto">Motto (optional)</Label>
        <Textarea id="motto" name="motto" maxLength={120} />
      </div>
      {state.error && <p className="text-xs text-destructive font-mono">// {state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Forging…" : "Plant banner"}</Button>
    </form>
  );
}
