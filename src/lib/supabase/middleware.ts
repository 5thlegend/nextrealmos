import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options?: any }[]) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/sign-in") || path.startsWith("/sign-up") || path.startsWith("/auth");

  // Protected = anything in the dashboard layout PLUS /operator/onboarding
  // (which mints the operator profile). Public dossiers under
  // /operator/[callsign] must NOT be protected — they're the social
  // graph + share targets.
  const isProtected =
    path.startsWith("/dashboard")  ||
    path.startsWith("/missions")   ||
    path.startsWith("/squads")     ||
    path.startsWith("/workflows")  ||
    path.startsWith("/grid")       ||
    path.startsWith("/wonders")    ||
    path.startsWith("/transmissions") ||
    path.startsWith("/leaderboard") ||
    path.startsWith("/achievements") ||
    path.startsWith("/armory")     ||
    path === "/operator/onboarding" ||
    path === "/operator";          // only the bare /operator route, not /operator/[callsign]

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
