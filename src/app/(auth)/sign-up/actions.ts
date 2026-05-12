"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  callsign: z.string()
    .min(3, "Callsign must be 3-24 characters.")
    .max(24)
    .regex(/^[A-Za-z0-9_.-]+$/, "Callsign: letters, numbers, _ . - only."),
  next: z.string().optional(),
});

export type SignUpState = { error?: string };

export async function signUpAction(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    callsign: formData.get("callsign"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid form." };

  const supabase = await createSupabaseServer();
  const { data: signUp, error: authErr } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { callsign: parsed.data.callsign } },
  });
  if (authErr) return { error: authErr.message };
  if (!signUp.user) return { error: "Sign-up succeeded but no user returned." };

  // Provision the operator profile immediately via service role so it succeeds
  // regardless of whether email confirmations are on (no session yet) or off.
  const admin = createSupabaseAdmin();
  const { data: ranks } = await admin.from("ranks").select("id").eq("tier", "INITIATE").maybeSingle();
  const { error: insErr } = await admin.from("operator_profiles").insert({
    user_id: signUp.user.id,
    callsign: parsed.data.callsign,
    rank_id: ranks?.id ?? null,
    xp: 0,
  });
  if (insErr && !insErr.message.toLowerCase().includes("duplicate")) {
    return { error: `Identity created but profile failed: ${insErr.message}` };
  }

  revalidatePath("/", "layout");
  // After sign-up, propagate `next` through onboarding so the operator lands
  // where they came from after finishing setup.
  const nxt = parsed.data.next && parsed.data.next.startsWith("/") ? parsed.data.next : null;
  redirect(nxt ? `/operator/onboarding?next=${encodeURIComponent(nxt)}` : "/operator/onboarding");
}
