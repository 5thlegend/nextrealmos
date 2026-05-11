"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentOperator } from "@/services/operator-service";
import { createSquad } from "@/services/squad-service";

const Schema = z.object({
  name: z.string().min(2).max(48),
  tag:  z.string().min(2).max(8).regex(/^[A-Za-z0-9]+$/, "Tag: letters/numbers only."),
  motto: z.string().max(120).optional(),
});

export type NewSquadState = { error?: string };

export async function createSquadAction(_prev: NewSquadState, formData: FormData): Promise<NewSquadState> {
  const op = await getCurrentOperator();
  if (!op) return { error: "Not authenticated" };
  const parsed = Schema.safeParse({
    name: formData.get("name"),
    tag: formData.get("tag"),
    motto: formData.get("motto") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid form" };

  try {
    const id = await createSquad(op.profile.id, parsed.data);
    revalidatePath("/squads");
    redirect(`/squads`);
    void id;
  } catch (e: any) {
    return { error: e?.message ?? "Could not create squad" };
  }
  return {};
}
