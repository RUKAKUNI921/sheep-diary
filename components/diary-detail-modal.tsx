import { useEffect, useState } from "react";
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { diaryToSheepAppearance } from "../lib/sheep-mapping";
import { CLOSE_BUTTON_SOURCE, FUKIDASHI_SOURCE, MODAL_BACKGROUND_SOURCE } from "../lib/ui-assets";
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

          <ImageBackground source={MODAL_BACKGROUND_SOURCE} style={styles.sheetInner} resizeMode="stretch">
            {displayedDiary && (
              <View style={styles.content}>
                <Text style={styles.date}>{formatDate(displayedDiary.created_at)}</Text>
                <View style={styles.sheepPreview}>
                  <SheepSprite
                    {...diaryToSheepAppearance(displayedDiary)}
                    eye={eye}
                    state="idle"
                    animated={false}
                    scale={PREVIEW_SCALE}
                    textured
                  />
                  <View style={styles.fukidashiOverlay}>
                    <Image source={FUKIDASHI_SOURCE} style={styles.fukidashi} resizeMode="contain" />
                    <Text style={styles.highlight} numberOfLines={2}>
                      {displayedDiary.highlight_quote}
                    </Text>
                  </View>
                </View>

                <ScrollView style={styles.transcriptContainer} bounces={false} overScrollMode="never">
                  <Text style={styles.transcript}>{displayedDiary.transcribed_text}</Text>
                </ScrollView>
              </View>
            )}
          </ImageBackground>
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
    width: 305,
    height: 430,
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
  sheetInner: {
    flex: 1,
    overflow: "hidden",
    padding: 30,
  },
  content: {
    alignItems: "center",
  },
  date: {
    fontFamily: "SetoFont",
    fontSize: 20,
    color: "#000",
  },
  sheepPreview: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 35,
  },
  fukidashiOverlay: {
    position: "absolute",
    top: -20,
    // right: 0,
    // bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  fukidashi: {
    width: 125,
    height: 55,
  },
  highlight: {
    position: "absolute",
    top: 7,
    left: 12,
    fontFamily: "SetoFont",
    fontSize: 14,
    lineHeight: 14 * 1.2,
    color: "#000",
    width: 110,
  },
  transcriptContainer: {
    marginTop: 10,
    width: 200,
    height: 100,
    alignSelf: "center",
  },
  transcript: {
    fontFamily: "SetoFont",
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: "#000",
  },
  stars: {
    marginTop: 20,
    alignSelf: "stretch",
    gap: 4,
  },
});
