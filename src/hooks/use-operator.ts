"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OperatorProfile } from "@/types/nros";

export function useOperator() {
  const [operator, setOperator] = useState<OperatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) { setOperator(null); setLoading(false); }
        return;
      }
      const { data } = await supabase.from("operator_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!cancelled) {
        setOperator(data ? (data as unknown as OperatorProfile) : null);
        setLoading(false);
      }
    }
    load();

    // Realtime updates for live XP / rank changes.
    const channel = supabase
      .channel("op-profile")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "operator_profiles" }, (payload) => {
        if (!cancelled && payload.new) setOperator(payload.new as OperatorProfile);
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  return { operator, loading };
}
