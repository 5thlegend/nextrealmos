import OpenAI from "openai";
import { env } from "@/lib/env";

let _client: OpenAI | null = null;
export function openai() {
  if (!_client) _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _client;
}

export async function* openaiStream(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}) {
  const stream = await openai().chat.completions.create({
    model: opts.model,
    stream: true,
    max_tokens: opts.maxTokens ?? 1024,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });
  for await (const chunk of stream) {
    const t = chunk.choices[0]?.delta?.content;
    if (t) yield t;
  }
}

export async function openaiComplete(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await openai().chat.completions.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 2048,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}
