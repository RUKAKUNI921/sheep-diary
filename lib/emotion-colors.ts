import { DEFAULT_BODY_COLOR } from "../components/sheep-sprite";

export const EMOTION_COLORS: Record<string, string> = {
  "不安・鬱": "#6470C6",
  "楽しい・嬉しい": "#FFA959",
  "怒り・イライラ": "#FA5A5C",
  悲しみ: "#2AB9E3",
  "安心・平常": "#38D281",
  "好き・愛": "#F497EA",
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
