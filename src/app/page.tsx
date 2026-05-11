import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Brain, Workflow, Users } from "lucide-react";

const pillars = [
  { icon: Activity, title: "Mission System",     body: "Operator-grade objectives, XP rewards, rank progression." },
  { icon: Brain,    title: "GENUBRA AI",         body: "Strategic intelligence — not a chatbot. Goal analysis, mission generation, monetization." },
  { icon: Workflow, title: "OBLISK Engine",      body: "Decompose objectives into phases, tasks, automations, recommended stacks." },
  { icon: Users,    title: "Squads & Ladder",    body: "Form squads, climb leaderboards, earn achievements." },
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
          <span className="font-mono text-sm tracking-[0.24em] uppercase">NROS · KERNEL V1</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link href="/sign-in">Sign in</Link></Button>
          <Button asChild size="sm"><Link href="/sign-up">Activate Operator</Link></Button>
        </div>
      </header>

      <section className="relative z-10 px-6 lg:px-10 pt-12 pb-20 max-w-6xl mx-auto">
        <Badge variant="outline" className="mb-6">// next.realm.ops // build 1.0.0</Badge>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] max-w-4xl">
          The operating system for <span className="text-primary">sovereign operators</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-base md:text-lg text-muted-foreground">
          NROS coordinates missions, ranks, AI strategy, and workflow execution into a single tactical surface.
          GENUBRA powers intelligence. OBLISK powers manifestation. You command both.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link href="/sign-up">Activate Operator Identity</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/sign-in">Resume Session</Link></Button>
        </div>
      </section>

      <section className="relative z-10 px-6 lg:px-10 pb-24 max-w-6xl mx-auto grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pillars.map(({ icon: Icon, title, body }) => (
          <article key={title} className="nros-deck p-5">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>

      <footer className="relative z-10 border-t border-border/60 py-6 px-6 lg:px-10 flex justify-between text-xs font-mono text-muted-foreground">
        <span>// next realm interactive</span>
        <span>SOVEREIGN OPERATOR ECOSYSTEM</span>
      </footer>
    </main>
  );
}
