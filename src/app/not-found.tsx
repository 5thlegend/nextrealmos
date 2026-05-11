import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-4">
        <p className="nros-eyebrow">// signal lost</p>
        <h1 className="text-5xl font-semibold tracking-tight">404</h1>
        <p className="text-sm text-muted-foreground">No transmission at this coordinate.</p>
        <Button asChild><Link href="/">Return to surface</Link></Button>
      </div>
    </main>
  );
}
