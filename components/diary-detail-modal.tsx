import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { diaryToSheepAppearance } from "../lib/sheep-mapping";
import { getVoiceDiary, VoiceDiary } from "../lib/voice-diary-api";
import { EmotionBadge } from "./emotion-badge";
import { EyeVariant, SheepSprite } from "./sheep-sprite";
import { StarRating } from "./star-rating";

const PREVIEW_SCALE = 160 / 1080;

type DiaryDetailModalProps = {
  diaryId: string | null;
  onClose: () => void;
  eye: EyeVariant;
};

export function DiaryDetailModal({
  diaryId,
  onClose,
  eye,
}: DiaryDetailModalProps) {
  const [diary, setDiary] = useState<VoiceDiary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!diaryId) {
      setDiary(null);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    getVoiceDiary(diaryId)
      .then(setDiary)
      .catch((err) =>
        setErrorMessage(
          err instanceof Error ? err.message : "読み込みに失敗しました",
        ),
      )
      .finally(() => setIsLoading(false));
  }, [diaryId]);

  return (
    <Modal
      visible={!!diaryId}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>日記の詳細</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeText}>閉じる</Text>
            </Pressable>
          </View>

          {isLoading && <Text style={styles.emptyText}>読み込み中...</Text>}
          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}

          {diary && (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.sheepPreview}>
                <SheepSprite
                  {...diaryToSheepAppearance(diary)}
                  eye={eye}
                  state="idle"
                  animated={false}
                  scale={PREVIEW_SCALE}
                />
              </View>
              <EmotionBadge emotion={diary.emotion} />
              <Text style={styles.date}>
                {new Date(diary.created_at).toLocaleString("ja-JP")}
              </Text>
              <Text style={styles.quote}>「{diary.highlight_quote}」</Text>
              <View style={styles.stars}>
                <StarRating label="速さ" score={diary.speed_score} />
                <StarRating label="間" score={diary.pause_score} />
                <StarRating label="量" score={diary.volume_score} />
              </View>
              <Text style={styles.transcript}>{diary.transcribed_text}</Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "88%",
    maxWidth: 420,
    maxHeight: "80%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeText: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  error: {
    color: "#E53935",
    textAlign: "center",
    marginTop: 12,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 24,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheepPreview: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  date: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  quote: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  stars: {
    marginTop: 20,
    alignSelf: "stretch",
    gap: 4,
  },
  transcript: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 21,
    color: "#666",
    alignSelf: "stretch",
  },
});
