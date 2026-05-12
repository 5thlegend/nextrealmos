// NROS core domain types — pure data shapes, no runtime deps.

export type UUID = string;

export type RankTier =
  | "INITIATE"
  | "OPERATOR"
  | "VANGUARD"
  | "ARCHITECT"
  | "WARDEN"
  | "SOVEREIGN";

export interface Rank {
  id: UUID;
  tier: RankTier;
  name: string;
  min_xp: number;
  badge_color: string;
  order_index: number;
}

export interface OperatorProfile {
  id: UUID;
  user_id: UUID;
  callsign: string;
  bio: string | null;
  avatar_url: string | null;
  rank_id: UUID | null;
  xp: number;
  squad_id: UUID | null;
  created_at: string;
  updated_at: string;
}

export type MissionStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type MissionDifficulty = "T1" | "T2" | "T3" | "T4" | "T5";

export interface Mission {
  id: UUID;
  title: string;
  brief: string;
  status: MissionStatus;
  difficulty: MissionDifficulty;
  xp_reward: number;
  tags: string[];
  created_by: UUID | null;
  created_at: string;
}

export type MissionProgressState = "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface MissionProgress {
  id: UUID;
  mission_id: UUID;
  operator_id: UUID;
  state: MissionProgressState;
  progress_pct: number;
  completed_at: string | null;
  created_at: string;
}

export interface XpLog {
  id: UUID;
  operator_id: UUID;
  delta: number;
  reason: string;
  source_type: "MISSION" | "WORKFLOW" | "ACHIEVEMENT" | "SYSTEM";
  source_id: UUID | null;
  created_at: string;
}

export interface Squad {
  id: UUID;
  name: string;
  tag: string;
  motto: string | null;
  banner_url: string | null;
  founder_id: UUID;
  created_at: string;
}

export interface SquadMember {
  squad_id: UUID;
  operator_id: UUID;
  role: "FOUNDER" | "OFFICER" | "MEMBER";
  joined_at: string;
}

export interface Achievement {
  id: UUID;
  code: string;
  name: string;
  description: string;
  icon: string;
  xp_bonus: number;
}

export type WorkflowStatus = "DRAFT" | "ACTIVE" | "ARCHIVED" | "COMPLETED";

export interface Workflow {
  id: UUID;
  operator_id: UUID;
  title: string;
  objective: string;
  status: WorkflowStatus;
  ai_summary: string | null;
  monetization_notes: string | null;
  recommended_stack: string[];
  created_at: string;
  updated_at: string;
}

export type WorkflowStepType = "PHASE" | "TASK" | "AUTOMATION" | "DECISION";
export type WorkflowStepStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";

export interface WorkflowStep {
  id: UUID;
  workflow_id: UUID;
  parent_id: UUID | null;
  type: WorkflowStepType;
  title: string;
  detail: string | null;
  status: WorkflowStepStatus;
  order_index: number;
  estimated_hours: number | null;
}

export type AiProvider = "anthropic" | "openai" | "cloudflare";
export type AiSurface = "GENUBRA" | "OBLISK" | "MISSION_GEN" | "AD_HOC";

export interface AiRequest {
  id: UUID;
  operator_id: UUID | null;
  surface: AiSurface;
  provider: AiProvider;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  prompt_excerpt: string;
  created_at: string;
}

export interface Notification {
  id: UUID;
  operator_id: UUID;
  kind: "MISSION" | "RANK" | "SQUAD" | "WORKFLOW" | "SYSTEM";
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}
