import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Brain, Code2, Globe2, Send, Smartphone } from "lucide-react";

import { AgentCore } from "@/components/AgentCore";
import { AgentHub } from "@/components/AgentHub";
import { AppShell } from "@/components/AppShell";
import { BrandMark } from "@/components/BrandMark";
import { InputBar } from "@/components/InputBar";
import { useProfile, useSettings, useUpdateSettings } from "@/hooks/useAccount";
import { createChatWithMessage } from "@/hooks/useChats";
import { AGENTS, agentName, type AgentId } from "@/lib/agents";
import { DEFAULT_MODEL } from "@/lib/models";

const ICONS = { code: Code2, smartphone: Smartphone, globe: Globe2, brain: Brain, send: Send };

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "RB Agent — Your AI Agent Hub" },
      {
        name: "description",
        content:
          "Talk to RB Agent and its five specialist sub agents for coding, phone automation, research, memory and social workflows.",
      },
      { property: "og:title", content: "RB Agent — Your AI Agent Hub" },
      {
        property: "og:description",
        content: "Voice powered assistant with five specialist sub agents and a permanent memory vault.",
      },
    ],
  }),
  component: HomeScreen,
});

function HomeScreen() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [hubOpen, setHubOpen] = useState(false);
  const [agent, setAgent] = useState<AgentId>("core");
  const [liveMode, setLiveMode] = useState(false);
  const [busy, setBusy] = useState(false);

  const model = settings?.model ?? DEFAULT_MODEL;
  const name = profile?.display_name ?? "friend";

  const send = async (text: string) => {
    setBusy(true);
    try {
      const chatId = await createChatWithMessage(text, agent);
      navigate({ to: "/c/$chatId", params: { chatId }, search: { live: liveMode ? 1 : 0 } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the chat.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-2xl flex-col px-4">
        <div className="flex flex-col items-center pt-6 text-center">
          <BrandMark size={72} />
          <h1 className="font-display mt-3 text-[22px] leading-snug font-semibold">
            नमस्ते, {name} आज आपका क्या प्लान है
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Speak or type. RB Agent remembers what matters.
          </p>
        </div>

        <div className="mt-2 flex justify-center">
          <AgentCore
            onClick={() => setHubOpen(true)}
            label={agent === "core" ? "RB Agent" : agentName(agent)}
          />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {AGENTS.map((item) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Brain;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAgent(item.id)}
                className={`glass flex items-center gap-2 rounded-2xl p-3 text-left transition-transform hover:-translate-y-0.5 ${
                  agent === item.id ? "ring-2 ring-ring" : ""
                }`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="truncate text-xs font-semibold">{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="sticky bottom-24 mt-5">
          <InputBar
            model={model}
            onModelChange={(id) => updateSettings.mutate({ ...settings, model: id })}
            onSend={send}
            busy={busy}
            liveMode={liveMode}
            onLiveModeChange={setLiveMode}
            agentLabel={agentName(agent)}
          />
        </div>
      </div>

      <AgentHub
        open={hubOpen}
        onOpenChange={setHubOpen}
        active={agent}
        onSelect={(id) => {
          setAgent(id);
          setHubOpen(false);
        }}
      />
    </AppShell>
  );
}
