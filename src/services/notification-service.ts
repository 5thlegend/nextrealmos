import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import type { Notification } from "@/types/nros";

export async function listOperatorNotifications(operatorId: string, limit = 12): Promise<Notification[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("operator_id", operatorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Notification[];
}

export async function countUnread(operatorId: string): Promise<number> {
  const supabase = await createSupabaseServer();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("operator_id", operatorId)
    .is("read_at", null);
  return count ?? 0;
}

export async function markAllRead(operatorId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("operator_id", operatorId)
    .is("read_at", null);
}

export async function markRead(operatorId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const admin = createSupabaseAdmin();
  await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("operator_id", operatorId)
    .in("id", ids);
}
