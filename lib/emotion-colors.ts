import { DEFAULT_BODY_COLOR } from "../components/sheep-sprite";

export const EMOTION_COLORS: Record<string, string> = {
  "不安・鬱": "#8D5BDB",
  "楽しい・嬉しい": "#FDB228",
  "怒り・イライラ": "#FF4339",
  悲しみ: "#008CDD",
  "安心・平常": "#00B058",
  "好き・愛": "#FF82AD",
};

export function colorForEmotion(emotion: string): string {
  return EMOTION_COLORS[emotion] ?? DEFAULT_BODY_COLOR;
}

const COLOR_TO_EMOTION: Record<string, string> = Object.fromEntries(
  Object.entries(EMOTION_COLORS).map(([emotion, color]) => [color, emotion]),
);

export function emotionForColor(color: string): string | undefined {
  return COLOR_TO_EMOTION[color];
}
