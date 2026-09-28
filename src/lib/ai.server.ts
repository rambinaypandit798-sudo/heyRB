const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export function gatewayKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured yet.");
  return key;
}

export async function embed(text: string): Promise<number[] | null> {
  const res = await fetch(`${GATEWAY}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gatewayKey()}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: text.slice(0, 6000) }),
  });
  if (!res.ok) {
    console.error("embedding failed", res.status, await res.text());
    return null;
  }
  const json = (await res.json()) as { data?: { embedding: number[] }[] };
  return json.data?.[0]?.embedding ?? null;
}

export async function chatCompletion(model: string, messages: { role: string; content: string }[]) {
  return fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gatewayKey()}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });
}

export async function completeOnce(model: string, messages: { role: string; content: string }[]) {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gatewayKey()}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() ?? null;
}

export const FORMAT_RULES = `Output formatting rules that you must never break:
Never use asterisk characters for bold or italics. Never use hash characters for headings. Never use markdown syntax of any kind, including backticks outside of real code blocks.
When you list features, options, steps or any structured multi point data, start every single item with the bullet dot character followed by one space, like this:
• first point
• second point
Never use numbers, dashes or asterisks as list markers. Keep prose clean, natural and plain.`;

export function systemPrompt(opts: {
  userName: string;
  agentPrompt?: string;
  memories: string[];
}) {
  const parts = [
    `You are RB Agent, an elite personal AI assistant and multi agent automation hub for ${opts.userName}. You speak naturally in the language the user writes in, including Hindi and Hinglish.`,
    opts.agentPrompt ?? "You are the RB Agent core assistant and you can route work to your coding, phone automation, research, memory and social sub agents.",
    FORMAT_RULES,
  ];
  if (opts.memories.length) {
    parts.push(
      `Long term memory vault for this user. Apply these silently and never ask for them again:\n${opts.memories
        .map((m) => `• ${m}`)
        .join("\n")}`,
    );
  }
  return parts.join("\n\n");
}
