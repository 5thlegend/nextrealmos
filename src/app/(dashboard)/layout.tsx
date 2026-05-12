import { redirect } from "next/navigation";
import { Sidebar } from "@/components/nros/sidebar";
import { Topbar } from "@/components/nros/topbar";
import { GenubraPanel } from "@/components/nros/genubra-panel";
import { GenubraPanelProvider } from "@/components/nros/genubra-panel-context";
import { AchievementToastStream } from "@/components/nros/achievement-toast-stream";
import { getCurrentOperator } from "@/services/operator-service";
import { env } from "@/lib/env";

export const runtime = "edge";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const op = await getCurrentOperator();
  if (!op) redirect("/operator/onboarding");

  return (
    <GenubraPanelProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            callsign={op.profile.callsign}
            rankName={op.rank?.name ?? null}
            xp={op.profile.xp}
            nextRankXp={op.nextRank?.min_xp ?? null}
            nextRankName={op.nextRank?.name ?? null}
          />
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
        <GenubraPanel />
        <AchievementToastStream
          operatorId={op.profile.id}
          supabaseUrl={env.SUPABASE_URL}
          supabaseAnonKey={env.SUPABASE_ANON_KEY}
        />
      </div>
    </GenubraPanelProvider>
  );
}
