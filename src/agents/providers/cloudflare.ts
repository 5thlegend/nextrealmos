// Cloudflare Workers AI provider — uses the bound `env.AI` runtime API.
// No HTTP key needed; auth comes from the Pages project's AI binding.
//
// Free tier: 10K neurons/day across all calls. Excellent for testing.
// Production swap: change NROS_AI_DEFAULT_PROVIDER to "anthropic".

import { getRequestContext } from "@cloudflare/next-on-pages";

// Cloudflare model catalog reference:
//   https://developers.cloudflare.com/workers-ai/models/
// Defaults below are tuned for instruction-following + speed.
export const CF_DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

type AIBinding = {
  run: (
    model: string,
    inputs: { messages: { role: string; content: string }[]; max_tokens?: number; stream?: boolean },
  ) => Promise<ReadableStream<Uint8Array> | { response?: string }>;
};

function getAi(): AIBinding {
  // next-on-pages exposes Cloudflare bindings via getRequestContext().
  // This call must be made inside a request handler.
  const ctx = getRequestContext();
  const ai = (ctx?.env as { AI?: AIBinding } | undefined)?.AI;
  if (!ai) {
    throw new Error(
      "Cloudflare AI binding (env.AI) is not configured. " +
      "Set the AI binding on the Pages project (Settings → Functions → AI bindings) " +
      "or switch NROS_AI_DEFAULT_PROVIDER to anthropic/openai.",
    );
  }
  return ai;
}

export async function cloudflareComplete(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const ai = getAi();
  const result = (await ai.run(opts.model, {
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    max_tokens: opts.maxTokens ?? 2048,
  })) as { response?: string };
  return result.response ?? "";
}

export async function* cloudflareStream(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): AsyncGenerator<string> {
  const ai = getAi();
  const stream = (await ai.run(opts.model, {
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    max_tokens: opts.maxTokens ?? 1024,
    stream: true,
  })) as ReadableStream<Uint8Array>;

  // Workers AI streams as text/event-stream. Each event is `data: {"response":"chunk"}\n\n`.
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Pull complete SSE events out of the buffer.
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const event = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        // Each event line: `data: <json>` or `data: [DONE]`.
        for (const line of event.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload);
            if (typeof obj.response === "string" && obj.response) yield obj.response;
          } catch {
            // ignore malformed chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
