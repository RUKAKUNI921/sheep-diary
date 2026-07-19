import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-latest";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EMOTIONS = ["不安・鬱", "楽しい・嬉しい", "怒り・イライラ", "悲しみ", "安心・平常", "好き・愛"] as const;
type Emotion = (typeof EMOTIONS)[number];

// 5段階正規化の閾値（叩き台。運用しながら調整する）
const VOLUME_CHAR_THRESHOLDS = [50, 150, 400, 800];
const SPEED_CPS_THRESHOLDS = [3, 5, 7, 9];
// 「間」の指標には「発話時間 ÷ 文字数」（1文字あたりの秒数）を使う。
// セグメント間の無音秒数（totalGap）で試したところ、Geminiの書き起こしは
// 実際の音声にある間をほぼ拾わずセグメントを隙間なく繋げて返す傾向があり、
// totalGapが常に0近辺に張り付いてpause_scoreが動かなかったため変更。
const PAUSE_SECONDS_PER_CHAR_THRESHOLDS = [0.15, 0.22, 0.3, 0.4];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface GeminiAnalysis {
  segments: Segment[];
  overall_emotion: string;
  sub_emotion: string | null;
  highlight_quote: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function bucketize(value: number, thresholds: readonly number[]): 1 | 2 | 3 | 4 | 5 {
  for (let i = 0; i < thresholds.length; i++) {
    if (value < thresholds[i]) return (i + 1) as 1 | 2 | 3 | 4 | 5;
  }
  return 5;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithBackoff(
  input: string,
  init: RequestInit,
  maxRetries = 5,
): Promise<Response> {
  let attempt = 0;
  for (;;) {
    const res = await fetch(input, init);
    if (res.status !== 429 || attempt >= maxRetries) return res;
    const delay = 2 ** attempt * 1000 + Math.floor(Math.random() * 250);
    await sleep(delay);
    attempt++;
  }
}

async function uploadAudioToGemini(bytes: ArrayBuffer, mimeType: string): Promise<string> {
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: "voice-diary" } }),
    },
  );
  if (!startRes.ok) {
    throw new Error(`Gemini file upload start failed: ${startRes.status} ${await startRes.text()}`);
  }
  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini file upload did not return an upload URL");

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  });
  if (!uploadRes.ok) {
    throw new Error(`Gemini file upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }
  const uploaded = await uploadRes.json();
  const fileName: string = uploaded.file.name;
  let fileUri: string = uploaded.file.uri;
  let state: string = uploaded.file.state;

  for (let i = 0; i < 10 && state === "PROCESSING"; i++) {
    await sleep(1000);
    const statusRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`,
    );
    const statusBody = await statusRes.json();
    state = statusBody.state;
    fileUri = statusBody.uri;
  }
  if (state !== "ACTIVE") throw new Error(`Gemini file did not become ACTIVE (state=${state})`);
  return fileUri;
}

async function analyzeWithGemini(fileUri: string, mimeType: string): Promise<GeminiAnalysis> {
  const res = await fetchWithBackoff(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "この音声日記を書き起こし、開始・終了時刻（秒, 数値）付きでセグメントに分割してください。" +
                  "また、日記全体を通して最も支配的だった感情カテゴリを1つ選んでoverall_emotionとしてください。" +
                  "そのうえで、overall_emotionとは異なる感情がその日記の中で明確に読み取れる場合だけ、" +
                  "その感情カテゴリを1つ選んでsub_emotionとしてください。" +
                  "無理にひねり出さず、はっきり読み取れない・overall_emotion以外の感情がほぼ感じられない場合は" +
                  "sub_emotionをnullにしてください。" +
                  "日記の中でその日いちばん印象に残った出来事を表す一節を、原文からそのまま15文字以内で抜き出してください" +
                  "（要約・言い換え禁止。文の一部を切り出すのは可）。" +
                  "感情や気持ちの説明ではなく、「何があったか」が具体的に伝わる部分を優先してください。",
              },
              { file_data: { mime_type: mimeType, file_uri: fileUri } },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: {
            type: "object",
            properties: {
              segments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    start: { type: "number" },
                    end: { type: "number" },
                    text: { type: "string" },
                  },
                  required: ["start", "end", "text"],
                },
              },
              overall_emotion: { type: "string", enum: EMOTIONS as unknown as string[] },
              sub_emotion: { type: "string", enum: EMOTIONS as unknown as string[], nullable: true },
              highlight_quote: { type: "string" },
            },
            required: ["segments", "overall_emotion", "sub_emotion", "highlight_quote"],
          },
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini generateContent failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  const text: string = body.candidates[0].content.parts[0].text;
  return JSON.parse(text);
}

function computeScores(segments: Segment[]) {
  const totalChars = segments.reduce((sum, s) => sum + s.text.length, 0);
  const volume_score = bucketize(totalChars, VOLUME_CHAR_THRESHOLDS);

  let weightedCpsSum = 0;
  let durationSum = 0;
  for (const s of segments) {
    const duration = s.end - s.start;
    if (duration <= 0) continue;
    weightedCpsSum += (s.text.length / duration) * duration;
    durationSum += duration;
  }
  const avgCps = durationSum > 0 ? weightedCpsSum / durationSum : 0;
  const speed_score = bucketize(avgCps, SPEED_CPS_THRESHOLDS);

  const secondsPerChar = totalChars > 0 ? durationSum / totalChars : 0;
  const pause_score = bucketize(secondsPerChar, PAUSE_SECONDS_PER_CHAR_THRESHOLDS);

  return { speed_score, pause_score, volume_score };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  if (!GEMINI_API_KEY) {
    return jsonResponse({ error: "GEMINI_API_KEY is not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "missing Authorization header" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let audioFile: File;
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) throw new Error("missing audio field");
    audioFile = file;
  } catch {
    return jsonResponse({ error: "expected multipart/form-data with an 'audio' file field" }, 400);
  }

  const bytes = await audioFile.arrayBuffer();
  const mimeType = audioFile.type || "audio/mp4";
  const audioHash = await sha256Hex(bytes);

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    let analysis: GeminiAnalysis;

    const { data: cached } = await serviceClient
      .from("gemini_response_cache")
      .select("response")
      .eq("audio_hash", audioHash)
      .eq("model", GEMINI_MODEL)
      .maybeSingle();

    if (cached) {
      analysis = cached.response as GeminiAnalysis;
    } else {
      const fileUri = await uploadAudioToGemini(bytes, mimeType);
      analysis = await analyzeWithGemini(fileUri, mimeType);
      await serviceClient.from("gemini_response_cache").insert({
        audio_hash: audioHash,
        model: GEMINI_MODEL,
        response: analysis,
      });
    }

    if (!EMOTIONS.includes(analysis.overall_emotion as Emotion)) {
      throw new Error(`Gemini returned an unexpected emotion: ${analysis.overall_emotion}`);
    }
    if (analysis.sub_emotion !== null && !EMOTIONS.includes(analysis.sub_emotion as Emotion)) {
      throw new Error(`Gemini returned an unexpected sub_emotion: ${analysis.sub_emotion}`);
    }

    const highlightQuote =
      analysis.highlight_quote.length > 15
        ? analysis.highlight_quote.slice(0, 15)
        : analysis.highlight_quote;

    const transcribedText = analysis.segments.map((s) => s.text).join("");
    const scores = computeScores(analysis.segments);

    return jsonResponse({
      transcribed_text: transcribedText,
      emotion: analysis.overall_emotion,
      sub_emotion: analysis.sub_emotion,
      highlight_quote: highlightQuote,
      ...scores,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "analysis failed" }, 502);
  }
});
