"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * Records the click as a subscription_intent BEFORE redirecting. Today
 * the intent records the lead even when Stripe isn't wired; once
 * STRIPE_SECRET_KEY is configured the same button starts a real Checkout
 * Session. Same UX, no rebuild.
 */
export function SubscribeButton({
  tierId,
  tierName,
  bannerColor,
  priceLabel,
  source = "tier_card",
  className,
}: {
  tierId: string;
  tierName: string;
  bannerColor: string;
  priceLabel: string;
  source?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (pending) return;
    startTransition(async () => {
      try {
        const r = await fetch("/api/subscription/intent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tier_id: tierId, source }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error ?? "intent failed");
        }
        const data = await r.json();
        if (data.stripe_ready && data.checkout_url) {
          window.location.href = data.checkout_url;
        } else if (data.redirect_url) {
          router.push(data.redirect_url);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not start subscription");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-opacity disabled:opacity-60 ${className ?? ""}`}
      style={{ background: bannerColor, color: "#0a0a0a" }}
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Starting…</span>
        </>
      ) : (
        <>
          <span>Subscribe · {priceLabel}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </>
      )}
      <span className="sr-only">{tierName}</span>
    </button>
  );
}
