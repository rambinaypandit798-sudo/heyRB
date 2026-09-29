import { Brain, Code2, Globe2, Send, Smartphone, type LucideIcon } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AGENTS, type AgentId } from "@/lib/agents";
import { BrandMark } from "@/components/BrandMark";

const ICONS: Record<string, LucideIcon> = {
  code: Code2,
  smartphone: Smartphone,
  globe: Globe2,
  brain: Brain,
  send: Send,
};

export function AgentHub({
  open,
  onOpenChange,
  onSelect,
  active,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (agent: AgentId) => void;
  active: AgentId;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-lg gap-5 rounded-3xl border-0 p-6">
        <DialogHeader className="items-center text-center">
          <BrandMark size={56} />
          <DialogTitle className="font-display text-xl">Sub Agents Hub</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Pick a specialist. Your saved memories travel with every agent.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => onSelect("core")}
            className={`glass flex items-center gap-3 rounded-2xl p-3.5 text-left transition-transform hover:-translate-y-0.5 ${
              active === "core" ? "ring-2 ring-ring" : ""
            }`}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent">
              <BrandMark size={26} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">RB Agent Core</span>
              <span className="block truncate text-xs text-muted-foreground">
                General assistant that can route work to any specialist
              </span>
            </span>
          </button>

          {AGENTS.map((agent, index) => {
            const Icon = ICONS[agent.icon] ?? Brain;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onSelect(agent.id)}
                style={{ animationDelay: `${index * 45}ms` }}
                className={`glass animate-rise flex items-center gap-3 rounded-2xl p-3.5 text-left transition-transform hover:-translate-y-0.5 ${
                  active === agent.id ? "ring-2 ring-ring" : ""
                }`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{agent.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{agent.domain}</span>
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
