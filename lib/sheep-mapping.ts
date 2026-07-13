import { BodyLevel, BodySize } from "../components/sheep-sprite";
import { colorForEmotion } from "./emotion-colors";
import { VoiceDiary } from "./voice-diary-api";

export function pauseScoreToBodyLevel(pauseScore: number): BodyLevel {
  if (pauseScore <= 2) return 1;
  if (pauseScore === 3) return 3;
  return 5;
}

export function volumeScoreToBodySize(volumeScore: number): BodySize {
  const clamped = Math.min(5, Math.max(1, Math.round(volumeScore)));
  return clamped as BodySize;
}

export type SheepAppearance = {
  bodyLevel: BodyLevel;
  bodySize: BodySize;
  bodyColor: string;
};

export function diaryToSheepAppearance(diary: VoiceDiary): SheepAppearance {
  return {
    bodyLevel: pauseScoreToBodyLevel(diary.pause_score),
    bodySize: volumeScoreToBodySize(diary.volume_score),
    bodyColor: colorForEmotion(diary.emotion),
  };
}
