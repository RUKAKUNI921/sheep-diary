import { useEffect, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { diaryToSheepAppearance } from "../lib/sheep-mapping";
import { CLOSE_BUTTON_SOURCE } from "../lib/ui-assets";
import { VoiceDiary } from "../lib/voice-diary-api";
import { EmotionBadge } from "./emotion-badge";
import { EyeVariant, SheepSprite } from "./sheep-sprite";
import { StarRating } from "./star-rating";

const PREVIEW_SCALE = 200 / 256;

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

type DiaryDetailModalProps = {
  diary: VoiceDiary | null;
  onClose: () => void;
  eye: EyeVariant;
};

export function DiaryDetailModal({ diary, onClose, eye }: DiaryDetailModalProps) {
  // Keep showing the last diary while the modal fades out instead of
  // unmounting the content the instant `diary` goes null — clearing it in
  // sync with `visible` leaves the native fade animating an empty shell,
  // which looks like a ghost/afterimage of the closed modal.
  const [displayedDiary, setDisplayedDiary] = useState(diary);
  useEffect(() => {
    if (diary) setDisplayedDiary(diary);
  }, [diary]);

  return (
    <Modal visible={!!diary} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
            <Image source={CLOSE_BUTTON_SOURCE} style={styles.closeButtonImage} resizeMode="contain" />
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>日記の詳細</Text>
          </View>

          {displayedDiary && (
            <View style={styles.content}>
              <View style={styles.sheepPreview}>
                <SheepSprite
                  {...diaryToSheepAppearance(displayedDiary)}
                  eye={eye}
                  state="idle"
                  animated={false}
                  scale={PREVIEW_SCALE}
                />
              </View>
              <EmotionBadge emotion={displayedDiary.emotion} />
              <Text style={styles.date}>{formatDate(displayedDiary.created_at)}</Text>
              <Text style={styles.quote}>「{displayedDiary.highlight_quote}」</Text>
              <Text style={styles.transcript}>{displayedDiary.transcribed_text}</Text>
            </View>
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
    borderWidth: 3,
    borderRadius: 40,
    width: 305,
    maxHeight: "80%",
    paddingBottom: 24,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    position: "absolute",
    top: -10,
    right: -10,
    zIndex: 1,
  },
  closeButtonImage: {
    width: 45,
    height: 45,
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
    fontFamily: "SetoFont",
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  quote: {
    fontFamily: "SetoFont",
    fontSize: 17,
    lineHeight: 17 * 1.3,
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
    fontFamily: "SetoFont",
    marginTop: 20,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: "#666",
    alignSelf: "stretch",
  },
});
