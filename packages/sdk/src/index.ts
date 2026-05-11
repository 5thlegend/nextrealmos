/**
 * @nros/sdk — Realm-side client for the NROS federation.
 *
 *   import { NrosClient } from "@nros/sdk";
 *
 *   const nros = new NrosClient({
 *     baseUrl: "https://nextrealmos.pages.dev",  // your NROS coordination URL
 *     apiKey:  process.env.NROS_API_KEY!,        // issued at realm registration
 *   });
 *
 *   await nros.transmissions.push({
 *     kind: "MISSION_COMPLETED",
 *     title: "Sentinel cleared the inbox",
 *     operator_callsign: "SENTINEL.04",
 *     metadata: { mission_id: "inbox-zero", duration_min: 12 },
 *   });
 *
 *   const op = await nros.operators.lookup("SENTINEL.04");
 *
 *   await nros.xp.award({ callsign: "SENTINEL.04", delta: 150, reason: "Inbox cleared" });
 *
 * The SDK is fetch-based and edge-runtime safe.
 */

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

export type RankTier = "INITIATE" | "OPERATOR" | "VANGUARD" | "ARCHITECT" | "WARDEN" | "SOVEREIGN";

export interface OperatorIdentity {
  id: string;
  callsign: string;
  universal_xp: number;
  rank: { tier: RankTier; name: string; min_xp: number } | null;
  avatar_url: string | null;
  since: string;
}

export interface PushTransmissionInput {
  kind: TransmissionKind;
  title: string;
  body?: string;
  operator_id?: string;
  metadata?: Record<string, unknown>;
  occurred_at?: string;
}

export interface AwardXpInput {
  operator_id?: string;
  callsign?: string;
  delta: number;
  reason: string;
  source_id?: string;
  emit_transmission?: boolean;
}

export interface AwardXpResult {
  operator_id: string;
  new_xp: number;
  promoted: boolean;
  new_rank: { tier: RankTier; name: string; min_xp: number } | null;
}

export interface NrosClientOptions {
  /** Base URL of the NROS coordination service. */
  baseUrl: string;
  /** API key issued when the realm was registered (begins with `nros_pk_`). */
  apiKey: string;
  /** Optional custom fetch (e.g. for retries, timeouts, tracing). */
  fetch?: typeof fetch;
}

export class NrosError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(`[NROS ${status}] ${message}`);
  }
}

export class NrosClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly _fetch: typeof fetch;

  constructor(opts: NrosClientOptions) {
    if (!opts.apiKey?.startsWith("nros_pk_")) {
      throw new Error("NrosClient: apiKey must begin with 'nros_pk_'");
    }
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this._fetch = opts.fetch ?? fetch;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this._fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) {
      const msg = (data && typeof data === "object" && "error" in data && typeof (data as any).error === "string")
        ? (data as any).error
        : res.statusText;
      throw new NrosError(res.status, msg, data);
    }
    return data as T;
  }

  readonly transmissions = {
    push: (input: PushTransmissionInput) =>
      this.request<{ transmission: { id: string; created_at: string } }>("/api/federation/transmissions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    list: (opts: { limit?: number; operator_id?: string } = {}) => {
      const q = new URLSearchParams();
      if (opts.limit)       q.set("limit", String(opts.limit));
      if (opts.operator_id) q.set("operator_id", opts.operator_id);
      return this.request<{ transmissions: unknown[] }>(`/api/federation/transmissions?${q}`);
    },
  };

  readonly xp = {
    award: (input: AwardXpInput) =>
      this.request<AwardXpResult>("/api/federation/xp", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  };

  readonly operators = {
    lookup: (callsign: string) =>
      this.request<{ operator: OperatorIdentity; realms: unknown[] }>(
        `/api/federation/operators/${encodeURIComponent(callsign)}`,
      ),
  };

  readonly realms = {
    list: () => this.request<{ realms: unknown[] }>("/api/federation/realms"),
  };
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}
