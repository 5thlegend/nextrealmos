import { env } from "@/lib/env";
import { anthropicComplete, anthropicStream } from "./providers/anthropic";
import { openaiComplete, openaiStream } from "./providers/openai";
import type { AiProvider, AiSurface } from "@/types/nros";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export type AiCall = {
  surface: AiSurface;
  system: string;
  user: string;
  provider?: AiProvider;
  model?: string;
  maxTokens?: number;
  operatorId?: string | null;
};

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-opus-4-7",
  openai: "gpt-4o-mini",
};

function resolve(call: AiCall) {
  const provider: AiProvider = call.provider ?? env.AI_DEFAULT_PROVIDER;
  const model = call.model ?? (provider === env.AI_DEFAULT_PROVIDER ? env.AI_DEFAULT_MODEL : DEFAULT_MODELS[provider]);
  return { provider, model };
}

async function logAiRequest(call: AiCall, provider: AiProvider, model: string) {
  try {
    const admin = createSupabaseAdmin();
    await admin.from("ai_requests").insert({
      operator_id: call.operatorId ?? null,
      surface: call.surface,
      provider,
      model,
      prompt_excerpt: call.user.slice(0, 280),
    });
  } catch {
    // Non-fatal: telemetry should never block AI calls.
  }
}

export async function aiComplete(call: AiCall): Promise<string> {
  const { provider, model } = resolve(call);
  void logAiRequest(call, provider, model);
  const opts = { model, system: call.system, user: call.user, maxTokens: call.maxTokens };
  return provider === "anthropic" ? anthropicComplete(opts) : openaiComplete(opts);
}

export function aiStream(call: AiCall): AsyncIterable<string> {
  const { provider, model } = resolve(call);
  void logAiRequest(call, provider, model);
  const opts = { model, system: call.system, user: call.user, maxTokens: call.maxTokens };
  return provider === "anthropic" ? anthropicStream(opts) : openaiStream(opts);
}

export function streamToResponse(stream: AsyncIterable<string>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) controller.enqueue(encoder.encode(chunk));
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n\n[error] ${err?.message ?? "stream failed"}`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
