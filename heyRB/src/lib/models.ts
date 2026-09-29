export type ModelTier = "Fast" | "Balanced" | "Max";

export type ModelOption = {
  id: string;
  label: string;
  tier: ModelTier;
  blurb: string;
};

/** Gemini line-up available to RB Agent. Ordered fast to most intelligent. */
export const MODELS: ModelOption[] = [
  {
    id: "google/gemini-3.1-flash-lite",
    label: "Gemini Flash Lite",
    tier: "Fast",
    blurb: "Lowest latency, great for quick answers",
  },
  {
    id: "google/gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    tier: "Fast",
    blurb: "Default everyday speed with strong reasoning",
  },
  {
    id: "google/gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    tier: "Balanced",
    blurb: "Balanced quality for longer tasks",
  },
  {
    id: "google/gemini-3-flash-preview",
    label: "Gemini Flash Preview",
    tier: "Balanced",
    blurb: "Newer conversational tuning",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini Pro Ultra",
    tier: "Max",
    blurb: "Deepest reasoning for complex work",
  },
];

export const DEFAULT_MODEL = "google/gemini-3.8-flash";

export function modelLabel(id: string) {
  return MODELS.find((m) => m.id === id)?.label ?? "Gemini 3.8 Flash";
}
