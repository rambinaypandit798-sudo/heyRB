import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_MODEL } from "@/lib/models";
import { DEFAULT_VOICE } from "@/lib/voices";

export type Settings = {
  user_id: string;
  model: string;
  voice_profile: string;
  wake_word_enabled: boolean;
  live_subtitles: boolean;
  telegram_bot_token: string | null;
  telegram_enabled: boolean;
  whatsapp_api_key: string | null;
  whatsapp_enabled: boolean;
  github_token: string | null;
  github_repo: string | null;
  automation_enabled: boolean;
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, ready, user: session?.user ?? null };
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (data) return data;
      const fallback = {
        id: auth.user.id,
        display_name: auth.user.email?.split("@")[0] ?? "Friend",
      };
      await supabase.from("profiles").upsert(fallback);
      return fallback;
    },
  });
}

const FALLBACK_SETTINGS: Omit<Settings, "user_id"> = {
  model: DEFAULT_MODEL,
  voice_profile: DEFAULT_VOICE,
  wake_word_enabled: false,
  live_subtitles: true,
  telegram_bot_token: null,
  telegram_enabled: false,
  whatsapp_api_key: null,
  whatsapp_enabled: false,
  github_token: null,
  github_repo: null,
  automation_enabled: false,
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<Settings | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (data) return data as Settings;
      const row = { user_id: auth.user.id, ...FALLBACK_SETTINGS };
      await supabase.from("user_settings").upsert(row);
      return row;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: auth.user.id, ...FALLBACK_SETTINGS, ...patch }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
