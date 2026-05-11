"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// We rely on explicit `as` casts at read-sites for type safety. Supabase's
// generic `Database` expects a strict GenericSchema shape; we trade that for
// pragmatism in KERNEL V1. Regenerate with `supabase gen types` to re-enable.
export function createClient() {
  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
