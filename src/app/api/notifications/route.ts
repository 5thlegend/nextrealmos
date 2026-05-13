// GET /api/notifications      → list operator's notifications
// POST /api/notifications/read → mark all as read

import { NextResponse } from "next/server";
import { getCurrentOperator } from "@/services/operator-service";
import { listOperatorNotifications, countUnread, markAllRead } from "@/services/notification-service";

export const runtime = "edge";

export async function GET() {
  const op = await getCurrentOperator();
  if (!op) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [items, unread] = await Promise.all([
    listOperatorNotifications(op.profile.id, 20),
    countUnread(op.profile.id),
  ]);
  return NextResponse.json({ notifications: items, unread });
}

export async function POST() {
  const op = await getCurrentOperator();
  if (!op) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  await markAllRead(op.profile.id);
  return NextResponse.json({ ok: true });
}
