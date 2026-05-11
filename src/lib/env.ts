// Centralized env access. Throws loudly at boot if a required server var is missing.

const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`[NROS] Missing required env var: ${name}`);
  return value;
};

export const env = {
  // public
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  // server
  get SUPABASE_SERVICE_ROLE_KEY() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get ANTHROPIC_API_KEY() {
    return required("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY);
  },
  get OPENAI_API_KEY() {
    return required("OPENAI_API_KEY", process.env.OPENAI_API_KEY);
  },

  // ai defaults
  AI_DEFAULT_PROVIDER: (process.env.NROS_AI_DEFAULT_PROVIDER ?? "anthropic") as "anthropic" | "openai",
  AI_DEFAULT_MODEL: process.env.NROS_AI_DEFAULT_MODEL ?? "claude-opus-4-7",
};
