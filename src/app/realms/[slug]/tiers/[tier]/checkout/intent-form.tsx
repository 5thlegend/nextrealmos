"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureIntentAction, type IntentState } from "./actions";

export function IntentForm({
  tierId,
  realmSlug,
  tierSlug,
  alreadyExpressed,
}: {
  tierId: string;
  realmSlug: string;
  tierSlug: string;
  alreadyExpressed: boolean;
}) {
  const [state, action, pending] = useActionState<IntentState, FormData>(captureIntentAction, {});

  useEffect(() => {
    if (state.ok) toast.success("Intent recorded", { description: "Realm owner will reach out the moment Stripe is wired." });
    if (state.error) toast.error(state.error);
  }, [state]);

  if (alreadyExpressed) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
        <Check className="h-3 w-3 text-emerald-300" />
        <p className="text-xs text-emerald-200">
          Intent on file. The realm owner will contact you when checkout is live.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="tier_id"    value={tierId} />
      <input type="hidden" name="realm_slug" value={realmSlug} />
      <input type="hidden" name="tier_slug"  value={tierSlug} />
      <Button size="sm" type="submit" disabled={pending}>
        <Bell className="h-3 w-3" /> {pending ? "Recording…" : "Reserve this tier"}
      </Button>
      <span className="text-[11px] text-muted-foreground">
        // we&apos;ll email you the moment Stripe checkout opens
      </span>
    </form>
  );
}
