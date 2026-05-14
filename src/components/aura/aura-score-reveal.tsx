"use client";

import { useEffect, useState } from "react";

/**
 * Animated score count-up + radial dial. The "wow moment" — score climbs
 * from 0 to the calibrated value over ~1.4s with eased motion. Magma
 * stroke at low/mid, gold at 70+.
 */
export function AuraScoreReveal({
  score,
  tier,
}: {
  score: number;
  tier: { label: string };
}) {
  const target = Math.max(0, Math.min(100, score));
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const duration = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setShown(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const stroke = target >= 70 ? "hsl(var(--nr-gold))" : "hsl(var(--nr-magma))";
  const r = 84;
  const c = 2 * Math.PI * r;
  const offset = c - (shown / 100) * c;

  return (
    <div className="relative w-[200px] h-[200px] shrink-0">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
        {/* track */}
        <circle cx="100" cy="100" r={r} fill="none"
                stroke="hsla(var(--nr-text), 0.08)" strokeWidth="6" />
        {/* progress */}
        <circle cx="100" cy="100" r={r} fill="none"
                stroke={stroke} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 60ms linear", filter: `drop-shadow(0 0 12px ${stroke})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="nr-display tabular-nums leading-none"
           style={{ fontSize: "76px", color: "hsl(var(--nr-text))" }}>
          {shown}
        </p>
        <p className="nr-eyebrow mt-1" style={{ color: target >= 70 ? "hsl(var(--nr-gold))" : "hsl(var(--nr-magma))" }}>
          {tier.label}
        </p>
      </div>
    </div>
  );
}
