import { Check, Sparkles } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MODELS, type ModelTier } from "@/lib/models";

const TIERS: ModelTier[] = ["Fast", "Balanced", "Max"];

export function ModelSheet({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="glass-strong rounded-t-3xl border-0 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Choose a Gemini model
          </SheetTitle>
          <SheetDescription>Your choice is saved and reused in every new chat.</SheetDescription>
        </SheetHeader>

        <div className="mt-2 space-y-5 overflow-y-auto px-4 pb-2">
          {TIERS.map((tier) => (
            <div key={tier} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {tier}
              </p>
              {MODELS.filter((m) => m.tier === tier).map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onChange(model.id);
                    onOpenChange(false);
                  }}
                  className={`glass flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ${
                    value === model.id ? "ring-2 ring-ring" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{model.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{model.blurb}</span>
                  </span>
                  {value === model.id ? <Check className="size-4 text-primary" /> : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
