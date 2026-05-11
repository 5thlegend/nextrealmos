import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOperator } from "@/services/operator-service";
import { createWorkflowFromObjective } from "@/services/workflow-service";

const Body = z.object({ objective: z.string().min(10).max(2000) });

export const runtime = "edge";
export const maxDuration = 60;

export async function POST(req: Request) {
  const op = await getCurrentOperator();
  if (!op) return new NextResponse("Unauthorized", { status: 401 });

  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  try {
    const result = await createWorkflowFromObjective({
      operatorId: op.profile.id,
      operatorCallsign: op.profile.callsign,
      objective: parsed.data.objective,
    });
    return NextResponse.json({ workflowId: result.workflowId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "OBLISK failed" }, { status: 500 });
  }
}
