// Federation domain types — added in V2 (NROS_KERNEL_V2_FEDERATION).

import type { UUID } from "./nros";

export type RealmStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export interface Realm {
  id: UUID;
  slug: string;
  name: string;
  description: string | null;
  base_url: string | null;
  icon_url: string | null;
  status: RealmStatus;
  owner_operator_id: UUID;
  metadata: Record<string, unknown>;
  created_at: string;
  approved_at: string | null;
  archived_at: string | null;
}

export type ApiKeyScope = "READ" | "WRITE" | "ADMIN";

export interface RealmApiKey {
  id: UUID;
  realm_id: UUID;
  name: string;
  key_prefix: string;
  key_hash: string;
  scope: ApiKeyScope;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface OperatorRealm {
  operator_id: UUID;
  realm_id: UUID;
  joined_at: string;
  realm_xp: number;
  realm_metadata: Record<string, unknown>;
  last_active_at: string | null;
}

export type TransmissionKind =
  | "OPERATOR_JOINED"
  | "XP_AWARDED"
  | "RANK_CHANGED"
  | "ACHIEVEMENT_UNLOCKED"
  | "MISSION_COMPLETED"
  | "WORKFLOW_FORGED"
  | "REALM_REGISTERED"
  | "SYSTEM"
  | "CUSTOM";

export interface Transmission {
  id: UUID;
  realm_id: UUID;
  operator_id: UUID | null;
  kind: TransmissionKind;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}
