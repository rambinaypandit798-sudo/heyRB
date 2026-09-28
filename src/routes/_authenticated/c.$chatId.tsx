import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { InputBar } from "@/components/InputBar";
import { LiveSubtitles, MessageList } from "@/components/MessageList";
import { useProfile, useSettings, useUpdateSettings } from "@/hooks/useAccount";
import { addMessage, streamReply, useMessages } from "@/hooks/useChats";
import { supabase } from "@/integrations/supabase/client";
import { agentName } from "@/lib/agents";
import { cleanText } from "@/lib/format";
import { DEFAULT_MODEL } from "@/lib/models";
import { speechEngine } from "@/lib/speech";
import { DEFAULT_VOICE } from "@/lib/voices";

export const Route = createFileRoute("/_authenticated/c/$chatId")({
  validateSearch: z.object({ live: z.number().optional() }),
  component: ChatScreen,
});

function ChatScreen() {
  const { chatId } = Route.useParams();
  const { live } = Route.useSearch();
  const queryClient = useQueryClient();
  const { data: messages = [], isLoading } = useMessages(chatId);
  const { data: settings } = useSettings();
  const { data: profile } = useProfile();
  const updateSettings = useUpdateSettings();

  const [streaming, setStreaming] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [liveMode, setLiveMode] = useState(live === 1);
  const [agent, setAgent] = useState("core");
  const [title, setTitle] = useState("RB Agent");
  const handled = useRef<Set<string>>(new Set());

  const model = settings?.model ?? DEFAULT_MODEL;
  const voiceId = settings?.voice_profile ?? DEFAULT_VOICE;

  useEffect(() => {
    supabase
      .from("chats")
      .select("title, agent")
      .eq("id", chatId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAgent(data.agent);
          setTitle(data.title);
        }
      });
  }, [chatId]);

  useEffect(() => () => speechEngine.stop(), [chatId]);

  const respond = useCallback(
    async (history: { role: "user" | "assistant"; content: string }[]) => {
      setThinking(true);
      try {
        const { text, memorySaved } = await streamReply({
          agent,
          model,
          history,
          onDelta: setStreaming,
        });
        const finalText = cleanText(text);
        if (finalText) {
          const saved = await addMessage(chatId, "assistant", finalText);
          if (memorySaved) {
            toast.success("Saved to your memory vault");
            queryClient.invalidateQueries({ queryKey: ["memories"] });
          }
          if (liveMode) speechEngine.speak(saved.id, finalText, voiceId);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "RB Agent could not reply.");
      } finally {
        setStreaming(null);
        setThinking(false);
        queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      }
    },
    [agent, chatId, liveMode, model, queryClient, voiceId],
  );

  // A trailing user message means the reply has not been generated yet.
  useEffect(() => {
    if (isLoading || thinking || streaming !== null) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || handled.current.has(last.id)) return;
    handled.current.add(last.id);
    respond(messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
  }, [isLoading, messages, respond, streaming, thinking]);

  const send = async (text: string) => {
    try {
      const saved = await addMessage(chatId, "user", text);
      handled.current.add(saved.id);
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      await respond([
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: text },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Message could not be sent.");
    }
  };

  return (
    <AppShell title={title}>
      <div className="mx-auto flex w-full max-w-2xl flex-col px-4">
        <p className="py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {agentName(agent)} · {profile?.display_name ?? "you"}
        </p>
        <MessageList
          messages={messages}
          streaming={streaming}
          thinking={thinking}
          voiceId={voiceId}
        />
        <div className="sticky bottom-24 mt-5 pb-2">
          <InputBar
            model={model}
            onModelChange={(id) => updateSettings.mutate({ ...settings, model: id })}
            onSend={send}
            busy={thinking || streaming !== null}
            liveMode={liveMode}
            onLiveModeChange={setLiveMode}
            agentLabel={agentName(agent)}
          />
        </div>
      </div>
      {settings?.live_subtitles !== false ? <LiveSubtitles /> : null}
    </AppShell>
  );
}
