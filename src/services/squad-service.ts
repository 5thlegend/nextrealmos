import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import type { Squad, SquadMember } from "@/types/nros";

export async function listSquads(): Promise<Array<Squad & { member_count: number }>> {
  const supabase = await createSupabaseServer();
  const { data: squads } = await supabase.from("squads").select("*").order("created_at", { ascending: false });
  const list = (squads ?? []) as Squad[];

  if (list.length === 0) return [];

  const { data: members } = await supabase
    .from("squad_members")
    .select("squad_id");
  const counts = new Map<string, number>();
  (members ?? []).forEach((m) => counts.set(m.squad_id, (counts.get(m.squad_id) ?? 0) + 1));

  return list.map((s) => ({ ...s, member_count: counts.get(s.id) ?? 0 }));
}

export async function getSquadWithMembers(squadId: string) {
  const supabase = await createSupabaseServer();
  const { data: squad } = await supabase.from("squads").select("*").eq("id", squadId).maybeSingle();
  if (!squad) return null;

  const { data: members } = await supabase
    .from("squad_members")
    .select("squad_id, operator_id, role, joined_at, operator_profiles(callsign, xp, avatar_url)")
    .eq("squad_id", squadId);

  return { squad: squad as Squad, members: members ?? [] };
}

export async function createSquad(operatorId: string, input: { name: string; tag: string; motto?: string }) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("squads")
    .insert({ name: input.name, tag: input.tag.toUpperCase(), motto: input.motto ?? null, founder_id: operatorId })
    .select("id")
    .single();
  if (error) throw error;

  // Founder auto-joins as FOUNDER role.
  await supabase.from("squad_members").insert({
    squad_id: data.id,
    operator_id: operatorId,
    role: "FOUNDER",
  } as SquadMember);

  // Reflect membership on profile (admin client to bypass RLS in case op'er can't update self in some flows).
  const admin = createSupabaseAdmin();
  await admin.from("operator_profiles").update({ squad_id: data.id }).eq("id", operatorId);

  return data.id;
}

export async function joinSquad(operatorId: string, squadId: string) {
  const supabase = await createSupabaseServer();
  await supabase.from("squad_members").insert({ squad_id: squadId, operator_id: operatorId, role: "MEMBER" } as SquadMember);
  const admin = createSupabaseAdmin();
  await admin.from("operator_profiles").update({ squad_id: squadId }).eq("id", operatorId);
}

export async function leaveSquad(operatorId: string, squadId: string) {
  const supabase = await createSupabaseServer();
  await supabase.from("squad_members").delete().eq("operator_id", operatorId).eq("squad_id", squadId);
  const admin = createSupabaseAdmin();
  await admin.from("operator_profiles").update({ squad_id: null }).eq("id", operatorId);
}
