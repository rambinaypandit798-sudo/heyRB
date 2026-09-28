import { cn } from "@/lib/utils";

/** The futuristic pulsing RB Agent core. Tapping it opens the sub agent hub. */
export function AgentCore({
  onClick,
  label = "RB Agent",
  size = 196,
  busy = false,
}: {
  onClick?: () => void;
  label?: string;
  size?: number;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open the ${label} sub agents hub`}
      className="group relative grid place-items-center outline-none"
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full bg-primary/25 blur-2xl animate-core-pulse"
        aria-hidden
      />
      <span
        className={cn(
          "absolute inset-3 rounded-full border border-primary/30 border-dashed",
          busy ? "animate-ring-spin" : "animate-ring-spin",
        )}
        aria-hidden
      />
      <span className="absolute inset-7 rounded-full border border-accent" aria-hidden />
      <span className="glass-strong absolute inset-9 rounded-full" aria-hidden />
      <span
        className="absolute inset-12 rounded-full bg-gradient-to-br from-accent to-primary/55 blur-[1px] animate-core-pulse"
        aria-hidden
      />
      <span className="relative z-10 text-center">
        <span className="font-display block text-lg font-semibold text-foreground text-glow">
          {label}
        </span>
        <span className="mt-0.5 block text-[11px] font-medium tracking-wide text-accent-foreground">
          {busy ? "thinking" : "tap to open agents"}
        </span>
      </span>
    </button>
  );
}
