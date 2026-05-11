import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden border-r border-border/60">
        <div className="absolute inset-0 nros-scanlines opacity-30" />
        <div className="absolute inset-0 grid place-items-center p-12">
          <div className="space-y-6 max-w-md">
            <Link href="/" className="font-mono text-xs tracking-[0.24em] uppercase text-muted-foreground">
              NROS · KERNEL V1
            </Link>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              Identity is the <span className="text-primary">first transmission</span>.
            </h1>
            <p className="text-sm text-muted-foreground">
              Operators access the kernel through a sovereign identity layer. Squads, ranks, and
              workflows orbit your callsign.
            </p>
            <div className="nros-deck p-4 font-mono text-xs text-muted-foreground space-y-1">
              <p>// SYSTEM REQUIREMENTS</p>
              <p>· verified email</p>
              <p>· chosen callsign</p>
              <p>· strategic objective</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid place-items-center p-6 lg:p-12">{children}</div>
    </main>
  );
}
