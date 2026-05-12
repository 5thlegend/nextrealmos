import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureOperatorProfile } from "@/services/operator-service";
import { Panel } from "@/components/nros/panel";
import { Button } from "@/components/ui/button";

export const runtime = "edge";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/dashboard";

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(safeNext)}`);

  // If profile already exists, head straight to the requested destination.
  const { data: existing } = await supabase
    .from("operator_profiles")
    .select("id, callsign")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) redirect(safeNext);

  // Otherwise, provision and continue.
  const callsign = (user.user_metadata?.callsign as string | undefined) ?? undefined;
  await ensureOperatorProfile(callsign);
  redirect(safeNext);

  // unreachable
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Panel eyebrow="// initialize" title="Provisioning operator identity">
        <p className="text-sm text-muted-foreground">Stand by…</p>
        <Button asChild className="mt-4"><Link href={safeNext}>Continue</Link></Button>
      </Panel>
    </main>
  );
}
