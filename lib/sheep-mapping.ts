import { BodyLevel, BodySize, RareHornKey } from "../components/sheep-sprite";
import { colorForEmotion } from "./emotion-colors";
import { AnalyzeResult } from "./voice-diary-api";

export function pauseScoreToBodyLevel(pauseScore: number): BodyLevel {
  const clamped = Math.min(5, Math.max(1, Math.round(pauseScore)));
  return clamped as BodyLevel;
}

export function volumeScoreToBodySize(volumeScore: number): BodySize {
  const clamped = Math.min(5, Math.max(1, Math.round(volumeScore)));
  return clamped as BodySize;
}

// Rare horns are awarded when a diary's bodyLevel + main emotion + sub
// emotion exactly match one of these combos, instead of the usual random
// horn variant.
const RARE_HORN_RULES: { bodyLevel: BodyLevel; emotion: string; subEmotion: string; horn: RareHornKey }[] = [
  { bodyLevel: 1, emotion: "怒り・イライラ", subEmotion: "安心・平常", horn: "apple" },
  { bodyLevel: 3, emotion: "楽しい・嬉しい", subEmotion: "怒り・イライラ", horn: "tenpura" },
  { bodyLevel: 5, emotion: "安心・平常", subEmotion: "楽しい・嬉しい", horn: "tanpopo" },
];

export function rareHornForCombo(
  bodyLevel: BodyLevel,
  emotion: string,
  subEmotion: string,
): RareHornKey | undefined {
  return RARE_HORN_RULES.find(
    (rule) => rule.bodyLevel === bodyLevel && rule.emotion === emotion && rule.subEmotion === subEmotion,
  )?.horn;
}

export type SheepAppearance = {
  bodyLevel: BodyLevel;
  bodySize: BodySize;
  bodyColor: string;
  hornColor: string;
  hornVariant?: number;
  rareHorn?: RareHornKey;
};

export function diaryToSheepAppearance(
  diary: AnalyzeResult & { horn_variant?: number | null },
): SheepAppearance {
  const bodyLevel = pauseScoreToBodyLevel(diary.pause_score);
  return {
    bodyLevel,
    bodySize: volumeScoreToBodySize(diary.volume_score),
    bodyColor: colorForEmotion(diary.emotion),
    hornColor: colorForEmotion(diary.sub_emotion),
    hornVariant: diary.horn_variant ?? undefined,
    rareHorn: rareHornForCombo(bodyLevel, diary.emotion, diary.sub_emotion),
  };
}
