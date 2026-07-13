import { BODY_COLOR_PRESETS, DEFAULT_BODY_COLOR } from "../components/sheep-sprite";

export const EMOTION_COLORS: Record<string, string> = {
  怒り: BODY_COLOR_PRESETS[0], // #FE2C59 赤
  恋: BODY_COLOR_PRESETS[1], // #FE6FEF ピンク
  楽しい: BODY_COLOR_PRESETS[2], // #EBAB2F 黄
  善: BODY_COLOR_PRESETS[3], // #32D27A 緑
  悲しい: BODY_COLOR_PRESETS[4], // #12BFEA 青
  憂鬱: BODY_COLOR_PRESETS[5], // #9731FF 紫
};

export function colorForEmotion(emotion: string): string {
  return EMOTION_COLORS[emotion] ?? DEFAULT_BODY_COLOR;
}
