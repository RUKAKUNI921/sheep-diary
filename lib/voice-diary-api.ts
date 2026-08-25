import { HORN_VARIANT_COUNT } from "../components/sheep-sprite";
import { supabase } from "./supabase";

const ANALYSIS_TIMEOUT_MS = 3 * 60 * 1000;

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

// Thrown when a job's analysis fails or times out. Carries the job id so
// callers can retry against the already-uploaded audio instead of re-recording.
export class VoiceDiaryAnalysisError extends Error {
  constructor(
    message: string,
    public readonly jobId: string,
  ) {
    super(message);
  }
}

// The edge function does the actual Gemini work and can run well past a
// typical request timeout, so it's invoked fire-and-forget here and the
// result is picked up via Realtime once the job row is updated — this
// decouples the client's wait from the edge function's execution time.
function waitForAnalysis(jobId: string, accessToken: string): Promise<AnalyzeResult> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  return new Promise<AnalyzeResult>((resolve, reject) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      supabase.removeChannel(channel);
      reject(new VoiceDiaryAnalysisError("解析がタイムアウトしました。もう一度お試しください", jobId));
    }, ANALYSIS_TIMEOUT_MS);

    const channel = supabase
      .channel(`voice-diary-job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "voice_diary_analysis_jobs", filter: `id=eq.${jobId}` },
        (payload) => {
          if (settled) return;
          const row = payload.new as { status: string; result: AnalyzeResult | null; error_message: string | null };
          if (row.status === "done" && row.result) {
            settled = true;
            clearTimeout(timeoutId);
            supabase.removeChannel(channel);
            resolve(row.result);
          } else if (row.status === "error") {
            settled = true;
            clearTimeout(timeoutId);
            supabase.removeChannel(channel);
            reject(new VoiceDiaryAnalysisError(row.error_message ?? "解析に失敗しました", jobId));
          }
        },
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED" || settled) return;
        fetch(`${supabaseUrl}/functions/v1/analyze-voice-diary`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: jobId }),
        }).catch(() => {});
      });
  });
}

export async function analyzeVoiceDiary(
  fileUri: string,
  mimeType: string,
): Promise<AnalyzeResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const userId = sessionData.session?.user.id;
  if (!accessToken || !userId) throw new Error("サインインが必要です");

  // fetch().arrayBuffer() works uniformly across web (blob: URLs) and native
  // (file:// URIs), unlike FormData which needs different shapes per platform.
  const arrayBuffer = await (await fetch(fileUri)).arrayBuffer();
  const extension = mimeType.split("/")[1]?.split(";")[0] || "m4a";
  const storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("voice-diary-audio")
    .upload(storagePath, arrayBuffer, { contentType: mimeType });
  if (uploadError) throw new Error(`音声のアップロードに失敗しました: ${uploadError.message}`);

  const { data: job, error: insertError } = await supabase
    .from("voice_diary_analysis_jobs")
    .insert({ user_id: userId, storage_path: storagePath, mime_type: mimeType })
    .select("id")
    .single();
  if (insertError || !job) throw new Error(`解析ジョブの作成に失敗しました: ${insertError?.message}`);

  return waitForAnalysis(job.id, accessToken);
}

// Re-runs analysis against audio that's already uploaded (job.storage_path),
// so a failed/timed-out analysis can be retried without re-recording.
export async function retryVoiceDiaryAnalysis(jobId: string): Promise<AnalyzeResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("サインインが必要です");

  const { error: resetError } = await supabase
    .from("voice_diary_analysis_jobs")
    .update({ status: "pending", error_message: null })
    .eq("id", jobId);
  if (resetError) throw new Error(`再試行の準備に失敗しました: ${resetError.message}`);

  return waitForAnalysis(jobId, accessToken);
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
