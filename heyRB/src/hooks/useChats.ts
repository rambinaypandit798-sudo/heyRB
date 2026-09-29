import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { chatTitleFrom } from "@/lib/format";

export type Chat = {
  id: string;
  title: string;
  agent: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export function useChats() {
  return useQuery({
    queryKey: ["chats"],
    queryFn: async (): Promise<Chat[]> => {
      const { data, error } = await supabase
        .from("chats")
        .select("id, title, agent, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Chat[];
    },
  });
}

export function useMessages(chatId: string | undefined) {
  return useQuery({
    queryKey: ["messages", chatId],
    enabled: Boolean(chatId),
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, chat_id, role, content, created_at")
        .eq("chat_id", chatId!)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ChatMessage[];
    },
  });
}

export async function createChatWithMessage(text: string, agent: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please sign in first.");
  const { data: chat, error } = await supabase
    .from("chats")
    .insert({ user_id: auth.user.id, title: chatTitleFrom(text), agent })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: msgError } = await supabase
    .from("messages")
    .insert({ chat_id: chat.id, user_id: auth.user.id, role: "user", content: text });
  if (msgError) throw new Error(msgError.message);
  return chat.id as string;
}

export async function addMessage(chatId: string, role: "user" | "assistant", content: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please sign in first.");
  const { data, error } = await supabase
    .from("messages")
    .insert({ chat_id: chatId, user_id: auth.user.id, role, content })
    .select("id, chat_id, role, content, created_at")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId);
  return data as ChatMessage;
}

export function useDeleteChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: string) => {
      const { error } = await supabase.from("chats").delete().eq("id", chatId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chats"] }),
  });
}

/** Streams an assistant reply from the RB Agent backend. */
export async function streamReply(opts: {
  agent: string;
  model: string;
  history: { role: "user" | "assistant"; content: string }[];
  onDelta: (full: string) => void;
}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired. Please sign in again.");

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ agent: opts.agent, model: opts.model, messages: opts.history }),
  });

  if (!res.ok || !res.body) {
    let message = "RB Agent could not answer right now.";
    try {
      const payload = (await res.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // keep default
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    opts.onDelta(full);
  }
  return { text: full, memorySaved: res.headers.get("X-Memory-Saved") === "1" };
}
