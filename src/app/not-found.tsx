import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden grid place-items-center p-6">
      <div className="pointer-events-none absolute inset-0 nros-scanlines opacity-30" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(900px 500px at 50% 30%, hsla(178, 92%, 56%, 0.10), transparent 60%), radial-gradient(700px 400px at 100% 100%, hsla(258, 80%, 70%, 0.08), transparent 55%)",
        }}
      />

      <div className="relative z-10 text-center space-y-6 max-w-lg">
        <div>
          <p className="nros-eyebrow">// signal lost · coordinate unmapped</p>
          <h1 className="text-7xl md:text-8xl font-semibold tracking-tight mt-2 bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text text-transparent">
            404
          </h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          No transmission at this coordinate. The realm may have been vaulted,
          the operator dossier deactivated, or the URL mistyped.
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button asChild>
            <Link href="/">Return to surface <ArrowRight className="h-3 w-3" /></Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/civilization">See the civilization</Link>
          </Button>
        </div>

        <div className="border-t border-border/40 pt-4 mt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            // next.realm.federation · kernel v3
          </p>
        </div>
      </div>
    </main>
  );
}
