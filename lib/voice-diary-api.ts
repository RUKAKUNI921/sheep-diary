import { HORN_VARIANT_COUNT } from "../components/sheep-sprite";
import { supabase } from "./supabase";

export type AnalyzeResult = {
  transcribed_text: string;
  emotion: string;
  sub_emotion: string | null;
  highlight_quote: string;
  speed_score: number;
  pause_score: number;
  volume_score: number;
};

export type VoiceDiary = AnalyzeResult & {
  id: string;
  created_at: string;
  horn_variant: number | null;
};

// Horn type isn't derived from the analysis; it's rolled once here and
// persisted so the sheep's horn never changes after the diary is saved.
export function pickRandomHornVariant(): number {
  return 1 + Math.floor(Math.random() * HORN_VARIANT_COUNT);
}

export async function analyzeVoiceDiary(
  fileUri: string,
  mimeType: string,
): Promise<AnalyzeResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("サインインが必要です");

  const form = new FormData();
  form.append("audio", {
    uri: fileUri,
    name: "voice-diary.m4a",
    type: mimeType,
  } as unknown as Blob);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/analyze-voice-diary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error ?? `解析に失敗しました (${res.status})`);
  }
  return res.json();
}

export async function saveVoiceDiary(
  result: AnalyzeResult,
  hornVariant: number,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("サインインが必要です");

  const { error } = await supabase.from("voice_diaries").insert({
    user_id: userId,
    transcribed_text: result.transcribed_text,
    emotion: result.emotion,
    sub_emotion: result.sub_emotion,
    highlight_quote: result.highlight_quote,
    speed_score: result.speed_score,
    pause_score: result.pause_score,
    volume_score: result.volume_score,
    horn_variant: hornVariant,
  });
  if (error) throw error;
}

export async function listVoiceDiaries(): Promise<VoiceDiary[]> {
  const { data, error } = await supabase
    .from("voice_diaries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
