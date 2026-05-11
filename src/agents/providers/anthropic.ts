import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

let _client: Anthropic | null = null;
export function anthropic() {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

export async function* anthropicStream(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}) {
  const stream = await anthropic().messages.stream({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

export async function anthropicComplete(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const msg = await anthropic().messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 2048,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
