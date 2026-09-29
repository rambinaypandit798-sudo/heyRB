import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { agentById } from "@/lib/agents";
import { hasMemoryTrigger } from "@/lib/memory-triggers";
import { chatCompletion, completeOnce, embed, systemPrompt } from "@/lib/ai.server";

type Incoming = {
  agent?: string;
  model?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json({ error: "Not signed in." }, 401);

        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        );

        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        const user = userData?.user;
        if (userError || !user) return json({ error: "Session expired. Please sign in again." }, 401);

        const body = (await request.json()) as Incoming;
        const history = (body.messages ?? []).filter((m) => m.content?.trim()).slice(-24);
        const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
        if (!lastUser) return json({ error: "Nothing to send." }, 400);

        const model = body.model || "google/gemini-3.8-flash";
        const agent = agentById(body.agent ?? "");

        const [{ data: profile }] = await Promise.all([
          supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        ]);

        // Long term memory retrieval through the vector index.
        let memories: string[] = [];
        const vector = await embed(lastUser);
        if (vector) {
          const { data: matches } = await supabase.rpc("match_memories", {
            p_embedding: vector as unknown as string,
            p_limit: 6,
          });
          memories = ((matches ?? []) as { content: string; similarity: number }[])
            .filter((m) => m.similarity > 0.15)
            .map((m) => m.content);
        }

        // Memory capture: the user explicitly asked RB Agent to remember something.
        let savedMemory: string | null = null;
        if (hasMemoryTrigger(lastUser)) {
          const extracted = await completeOnce(model, [
            {
              role: "system",
              content:
                "Extract the single durable fact or preference the user wants stored, as one short plain sentence in the user's own language. No markdown, no quotes, no preamble. If there is nothing durable, reply exactly NONE.",
            },
            { role: "user", content: lastUser },
          ]);
          if (extracted && extracted.toUpperCase() !== "NONE") {
            savedMemory = extracted;
            const memVector = await embed(extracted);
            await supabase.from("memories").insert({
              user_id: user.id,
              content: extracted,
              kind: "preference",
              embedding: memVector as unknown as string,
            });
            if (!memories.includes(extracted)) memories.unshift(extracted);
          }
        }

        const messages = [
          {
            role: "system",
            content:
              systemPrompt({
                userName: profile?.display_name ?? "friend",
                agentPrompt: agent?.prompt ?? undefined,
                memories,
              }) +
              (savedMemory
                ? `\n\nYou just stored this in the memory vault, confirm it briefly in one line: ${savedMemory}`
                : ""),
          },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ];

        const upstream = await chatCompletion(model, messages);
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error("gateway error", upstream.status, detail);
          if (upstream.status === 429)
            return json({ error: "Too many requests right now. Try again in a moment." }, 429);
          if (upstream.status === 402)
            return json({ error: "AI credits are exhausted. Add credits to keep chatting." }, 402);
          return json({ error: "The AI service could not be reached." }, 502);
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const payload = trimmed.slice(5).trim();
                  if (!payload || payload === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(payload) as {
                      choices?: { delta?: { content?: string } }[];
                    };
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) controller.enqueue(encoder.encode(delta));
                  } catch {
                    // partial frame, ignore
                  }
                }
              }
            } catch (error) {
              console.error("stream error", error);
            } finally {
              controller.close();
              reader.releaseLock();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Memory-Saved": savedMemory ? "1" : "0",
          },
        });
      },
    },
  },
});
