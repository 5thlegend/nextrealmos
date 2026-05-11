import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureOperatorProfile } from "@/services/operator-service";
import { Panel } from "@/components/nros/panel";
import { Button } from "@/components/ui/button";

export const runtime = "edge";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // If profile already exists, head straight to dashboard.
  const { data: existing } = await supabase
    .from("operator_profiles")
    .select("id, callsign")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) redirect("/dashboard");

  // Otherwise, create from metadata callsign or default.
  const callsign = (user.user_metadata?.callsign as string | undefined) ?? undefined;
  await ensureOperatorProfile(callsign);
  redirect("/dashboard");

  // unreachable, but satisfies TS
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Panel eyebrow="// initialize" title="Provisioning operator identity">
        <p className="text-sm text-muted-foreground">Stand by…</p>
        <Button asChild className="mt-4"><Link href="/dashboard">Continue</Link></Button>
      </Panel>
    </main>
  );
}
