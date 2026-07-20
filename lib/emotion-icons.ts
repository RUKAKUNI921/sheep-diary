import { ImageSourcePropType } from "react-native";

export const EMOTION_ICON_KEYS = ["anger", "love", "joy", "normal", "sadness", "anxity"] as const;
export type EmotionIconKey = (typeof EMOTION_ICON_KEYS)[number];

export const EMOTION_ICON_SOURCES: Record<EmotionIconKey, ImageSourcePropType> = {
  anger: require("../assets/emotion-icon/anger.png"),
  love: require("../assets/emotion-icon/love.png"),
  joy: require("../assets/emotion-icon/joy.png"),
  normal: require("../assets/emotion-icon/normal.png"),
  sadness: require("../assets/emotion-icon/sadness.png"),
  anxity: require("../assets/emotion-icon/anxity.png"),
};

// Maps each icon to the main-emotion string used in EMOTION_COLORS / diary.emotion.
export const EMOTION_ICON_TO_EMOTION: Record<EmotionIconKey, string> = {
  anger: "怒り・イライラ",
  love: "好き・愛",
  joy: "楽しい・嬉しい",
  normal: "安心・平常",
  sadness: "悲しみ",
  anxity: "不安・鬱",
};

// Every emotion icon image, for preloading at app startup.
export const EMOTION_ICON_ASSET_SOURCES: number[] = Object.values(EMOTION_ICON_SOURCES) as number[];

const EMOTION_TO_ICON_KEY: Record<string, EmotionIconKey> = Object.fromEntries(
  Object.entries(EMOTION_ICON_TO_EMOTION).map(([key, emotion]) => [emotion, key as EmotionIconKey]),
);

export function emotionIconForEmotion(emotion: string): EmotionIconKey | undefined {
  return EMOTION_TO_ICON_KEY[emotion];
}
