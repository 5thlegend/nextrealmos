// Hand-written Database type for Supabase generic schema.
// Regenerate via `supabase gen types typescript` once the schema stabilizes.

import type {
  Achievement,
  AiRequest,
  Mission,
  MissionProgress,
  Notification,
  OperatorProfile,
  Rank,
  Squad,
  SquadMember,
  Workflow,
  WorkflowStep,
  XpLog,
} from "./nros";

type Insertable<T> = { [K in keyof T]?: T[K] };
type Updatable<T> = { [K in keyof T]?: T[K] };

type Table<Row> = {
  Row: Row;
  Insert: Insertable<Row>;
  Update: Updatable<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      operator_profiles:      Table<OperatorProfile>;
      ranks:                  Table<Rank>;
      missions:               Table<Mission>;
      mission_progress:       Table<MissionProgress>;
      xp_logs:                Table<XpLog>;
      squads:                 Table<Squad>;
      squad_members:          Table<SquadMember>;
      achievements:           Table<Achievement>;
      operator_achievements:  Table<{ operator_id: string; achievement_id: string; awarded_at: string }>;
      workflows:              Table<Workflow>;
      workflow_steps:         Table<WorkflowStep>;
      ai_requests:            Table<AiRequest>;
      notifications:          Table<Notification>;
    };
    Views: {
      leaderboard_global: {
        Row: { operator_id: string; callsign: string; xp: number; rank_name: string | null; rank_index: number | null };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
