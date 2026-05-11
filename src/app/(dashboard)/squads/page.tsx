import Link from "next/link";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listSquads } from "@/services/squad-service";
import { getCurrentOperator } from "@/services/operator-service";

export default async function SquadsPage() {
  const [squads, op] = await Promise.all([listSquads(), getCurrentOperator()]);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <p className="nros-eyebrow">// federation</p>
          <h1 className="text-2xl font-semibold tracking-tight">Squads</h1>
          <p className="text-sm text-muted-foreground">Form coalitions. Earn squad XP. Dominate leaderboards.</p>
        </div>
        <Button asChild><Link href="/squads/new">Found Squad</Link></Button>
      </header>

      <Panel eyebrow={`// active · ${squads.length}`}>
        {squads.length === 0 ? (
          <p className="text-sm text-muted-foreground">// no squads yet — be the first to plant a banner</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {squads.map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    <span className="font-mono text-xs text-primary mr-2">[{s.tag}]</span>
                    {s.name}
                  </p>
                  {s.motto && <p className="text-xs text-muted-foreground mt-0.5">"{s.motto}"</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{s.member_count} ops</Badge>
                  {op?.profile.squad_id === s.id && <Badge variant="accent">YOURS</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
