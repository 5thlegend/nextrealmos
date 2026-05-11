import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: { name: string; value: string; options?: any }[]) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies — middleware handles refresh.
        }
      },
    },
  });
}

// Service-role client. NEVER import from client components.
export function createSupabaseAdmin() {
  return createAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
