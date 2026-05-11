import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "edge";

export async function POST() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", env.APP_URL));
}
