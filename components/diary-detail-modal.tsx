import { useEffect, useState } from "react";
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EMOTION_ICON_SOURCES, emotionIconForEmotion } from "../lib/emotion-icons";
import { diaryToSheepAppearance } from "../lib/sheep-mapping";
import { CLOSE_BUTTON_SOURCE, FUKIDASHI_SOURCE, MODAL_BACKGROUND_SOURCE, NAV_BUTTON_SOURCE } from "../lib/ui-assets";
import { VoiceDiary } from "../lib/voice-diary-api";
import { EmotionBadge } from "./emotion-badge";
import { EyeVariant, SheepSprite } from "./sheep-sprite";
import { StarRating } from "./star-rating";

const PREVIEW_SCALE = 200 / 256;
const NAV_BUTTON_WIDTH = 40;
const NAV_BUTTON_ASPECT_RATIO = 168 / 172;
const NAV_BUTTON_HEIGHT = NAV_BUTTON_WIDTH / NAV_BUTTON_ASPECT_RATIO;
const NAV_BUTTON_EDGE_OFFSET = 20;

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

type DiaryDetailModalProps = {
  diary: VoiceDiary | null;
  onClose: () => void;
  eye: EyeVariant;
  // Navigate to the previous/next entry (e.g. the calendar's day-ordered
  // list). Omit a handler to hide that button, e.g. at either end of the list.
  onPrev?: () => void;
  onNext?: () => void;
};

export function DiaryDetailModal({ diary, onClose, eye, onPrev, onNext }: DiaryDetailModalProps) {
  // Keep showing the last diary while the modal fades out instead of
  // unmounting the content the instant `diary` goes null — clearing it in
  // sync with `visible` leaves the native fade animating an empty shell,
  // which looks like a ghost/afterimage of the closed modal.
  const [displayedDiary, setDisplayedDiary] = useState(diary);
  useEffect(() => {
    if (diary) setDisplayedDiary(diary);
  }, [diary]);
  const [highlightLineCount, setHighlightLineCount] = useState(1);

  return (
    <Modal visible={!!diary} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
            <Image source={CLOSE_BUTTON_SOURCE} style={styles.closeButtonImage} resizeMode="contain" />
          </Pressable>

          <ImageBackground source={MODAL_BACKGROUND_SOURCE} style={styles.sheetInner} resizeMode="stretch">
            {displayedDiary && emotionIconForEmotion(displayedDiary.emotion) && (
              <Image
                source={EMOTION_ICON_SOURCES[emotionIconForEmotion(displayedDiary.emotion)!]}
                style={styles.emotionWatermark}
                resizeMode="contain"
              />
            )}

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
                    <Text
                      style={[
                        styles.highlight,
                        highlightLineCount === 1 ? styles.highlightOneLine : styles.highlightTwoLines,
                      ]}
                      onTextLayout={(e) => setHighlightLineCount(e.nativeEvent.lines.length)}
                    >
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

        {onPrev && (
          <Pressable style={styles.navButtonLeft} onPress={onPrev} hitSlop={12}>
            <Image source={NAV_BUTTON_SOURCE} style={styles.navButtonImage} resizeMode="contain" />
          </Pressable>
        )}
        {onNext && (
          <Pressable style={styles.navButtonRight} onPress={onNext} hitSlop={12}>
            <Image
              source={NAV_BUTTON_SOURCE}
              style={[styles.navButtonImage, styles.navButtonImageFlipped]}
              resizeMode="contain"
            />
          </Pressable>
        )}
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
  emotionWatermark: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 75,
    height: 75,
    opacity: 0.5,
    transform: [{ rotate: "15deg" }],
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
    left: 7.5,
    fontFamily: "SetoFont",
    fontSize: 14,
    lineHeight: 14 * 1.2,
    color: "#000",
    width: 113,
  },
  // 2行分の高さを前提にバブル内で縦中央になるよう調整済みの位置。1行の
  // ときはその半分だけ下にずらして、同じ基準で中央に来るようにする。
  highlightTwoLines: {
    top: 7,
  },
  highlightOneLine: {
    top: 7 + (14 * 1.2) / 2,
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
  navButtonLeft: {
    position: "absolute",
    left: NAV_BUTTON_EDGE_OFFSET,
    top: "50%",
    marginTop: -NAV_BUTTON_HEIGHT / 2,
  },
  navButtonRight: {
    position: "absolute",
    right: NAV_BUTTON_EDGE_OFFSET,
    top: "50%",
    marginTop: -NAV_BUTTON_HEIGHT / 2,
  },
  navButtonImage: {
    width: NAV_BUTTON_WIDTH,
    height: NAV_BUTTON_HEIGHT,
  },
  navButtonImageFlipped: {
    transform: [{ scaleX: -1 }],
  },
});
