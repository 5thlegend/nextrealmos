import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Brain, Globe, Workflow, GitBranch, ArrowUpRight, Shield, Zap } from "lucide-react";

const layers = [
  { icon: Brain,     name: "GENUBRA",         role: "cognition",     desc: "Memory, reasoning, operator graph" },
  { icon: GitBranch, name: "REALM GRAPH",     role: "governance",    desc: "Visual civilization control surface" },
  { icon: Workflow,  name: "OBLISK",          role: "execution",     desc: "Workflow + realm manifestation engine" },
  { icon: Activity,  name: "EVENT SPINE",     role: "synchronization", desc: "Federated transmission feed" },
  { icon: Shield,    name: "IDENTITY LAYER",  role: "operators",     desc: "Universal callsign across realms" },
  { icon: Zap,       name: "AGENT GRID",      role: "automation",    desc: "AI workers attached to realms" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 nros-scanlines opacity-30" />

      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/40 grid place-items-center">
            <span className="font-mono text-[10px] text-primary">NR</span>
          </div>
          <span className="font-mono text-sm tracking-[0.24em] uppercase">NROS · FEDERATION KERNEL</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link href="/sign-in">Operator sign-in</Link></Button>
          <Button asChild size="sm" variant="outline">
            <a href="https://nextrealm-operators.dankpenta.workers.dev" target="_blank" rel="noreferrer">
              Operator Grid <ArrowUpRight className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </header>

      <section className="relative z-10 px-6 lg:px-10 pt-12 pb-12 max-w-6xl mx-auto">
        <Badge variant="outline" className="mb-6">// next.realm.federation // kernel v3 · DIVINE-SYNC</Badge>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] max-w-5xl">
          The federation kernel for <span className="text-primary">sovereign operator realms</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-base md:text-lg text-muted-foreground">
          NROS is <strong className="text-foreground">infrastructure</strong> — the synchronization spine that
          binds independently deployable realms into one civilization. Not a website. Not a dashboard.
          The wiring underneath everything.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          The public operator experience lives at the{" "}
          <a href="https://nextrealm-operators.dankpenta.workers.dev" target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Operator Grid <ArrowUpRight className="inline h-3 w-3" />
          </a>
          . NROS is what binds it (and every other realm) together.
        </p>
      </section>

      <section className="relative z-10 px-6 lg:px-10 pb-12 max-w-6xl mx-auto">
        <p className="nros-eyebrow mb-4">// what NROS provides to every realm</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {layers.map(({ icon: Icon, name, role, desc }) => (
            <article key={name} className="nros-deck p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">// {role}</span>
              </div>
              <h3 className="font-semibold text-sm">{name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 lg:px-10 pb-12 max-w-6xl mx-auto">
        <div className="nros-deck p-5">
          <p className="nros-eyebrow mb-3">// federated realms (10)</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
            <RealmChip slug="nros-core" status="core" />
            <RealmChip slug="nro-operator-core" status="active" external="https://nextrealm-operators.dankpenta.workers.dev" />
            <RealmChip slug="arcseed" status="active" />
            <RealmChip slug="overnight-money-apps" status="active" />
            <RealmChip slug="money-factory" status="active" />
            <RealmChip slug="legvcy" status="active" />
            <RealmChip slug="divinwine" status="active" />
            <RealmChip slug="lastmile-os" status="active" />
            <RealmChip slug="weightroom-app" status="active" />
            <RealmChip slug="boba-ai" status="vault" />
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 lg:px-10 pb-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="nros-deck p-5">
            <p className="nros-eyebrow mb-2">// for operators</p>
            <h3 className="font-semibold mb-2">Live in the realms.</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your callsign is universal. Sign up once at NROS, then participate in any realm — your XP, rank,
              and reputation follow you everywhere.
            </p>
            <Button asChild variant="outline" size="sm">
              <a href="https://nextrealm-operators.dankpenta.workers.dev" target="_blank" rel="noreferrer">
                Open Operator Grid <ArrowUpRight className="h-3 w-3" />
              </a>
            </Button>
          </div>
          <div className="nros-deck p-5">
            <p className="nros-eyebrow mb-2">// for realm builders</p>
            <h3 className="font-semibold mb-2">Federate your realm.</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drop in <code className="text-primary font-mono text-xs">@nros/sdk</code>, register your realm,
              push civilization events. Universal identity, shared XP, federated event feed — for free.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/realms">Realm registry</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/60 py-6 px-6 lg:px-10 flex justify-between text-xs font-mono text-muted-foreground">
        <span>// next realm interactive · federation kernel v3</span>
        <span>SOVEREIGN OPERATOR FEDERATION</span>
      </footer>
    </main>
  );
}

function RealmChip({ slug, status, external }: { slug: string; status: "core" | "active" | "vault"; external?: string }) {
  const accent =
    status === "core" ? "border-nros-warn/40 bg-nros-warn/5 text-nros-warn"
    : status === "vault" ? "border-nros-rank/40 bg-nros-rank/5 text-nros-rank"
    : "border-primary/30 bg-primary/5 text-primary";
  const inner = (
    <span className={`block px-2 py-1.5 rounded border ${accent} truncate`}>
      /{slug}{external && <ArrowUpRight className="inline h-2.5 w-2.5 ml-1" />}
    </span>
  );
  return external ? <a href={external} target="_blank" rel="noreferrer" className="block">{inner}</a> : inner;
}
