import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { clamp, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { CharacterPreviewModal } from "../components/character-preview-modal";
import { DiaryDetailModal } from "../components/diary-detail-modal";
import { IsometricBackground } from "../components/isometric-background";
import { RoamingSheep } from "../components/roaming-sheep";
import { BodyLevel, BodySize, EYE_VARIANTS, EyeVariant, RareHornKey } from "../components/sheep-sprite";
import { useAuth } from "../contexts/auth-context";
import { useDiaries } from "../contexts/diaries-context";
import { supabase } from "../lib/supabase";
import { eyeVariantFromMetadata } from "../lib/eye-preference";
import { EMOTION_ICON_KEYS, EMOTION_ICON_SOURCES, EMOTION_ICON_TO_EMOTION } from "../lib/emotion-icons";
import { diaryToSheepAppearance } from "../lib/sheep-mapping";
import { PAPER_TEXTURE_SOURCE, TEXTURE_BLEND_MODE } from "../lib/texture-assets";
import {
  CALENDAR_BUTTON_SOURCE,
  CLOSE_BUTTON_SOURCE,
  SORT_BUTTON_ACTIVE_SOURCE,
  SORT_BUTTON_SOURCE,
  SORT_FUKIDASHI_SOURCE,
} from "../lib/ui-assets";
import { VoiceDiary } from "../lib/voice-diary-api";

type SheepEntry = {
  id: string;
  bodyLevel: BodyLevel;
  bodySize: BodySize;
  bodyColor: string;
  hornColor: string;
  hornVariant?: number;
  rareHorn?: RareHornKey;
  diaryId: string;
};

// The sheep's walking area extends this far past each screen edge; swipe to
// pan around and reveal it.
const PAN_MARGIN = 100;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const WORLD_WIDTH = SCREEN_WIDTH + PAN_MARGIN * 2;
const WORLD_HEIGHT = SCREEN_HEIGHT + PAN_MARGIN * 2;

// At most this many diaries become roaming sheep, chosen at random.
const MAX_SHEEP = 15;

// World coordinate that sits at the screen center when the pan is at its
// default (home) offset.
const HOME_CENTER_X = SCREEN_WIDTH / 2 + PAN_MARGIN;
const HOME_CENTER_Y = SCREEN_HEIGHT / 2 + PAN_MARGIN;

// Keeps the bottom panel's height in sync with the diary button below.
const DIARY_BUTTON_BOTTOM = 50;
const DIARY_BUTTON_SIZE = 100;

// Sort button sits to the left of the diary button, vertically centered on it.
const SORT_BUTTON_SIZE = 120;
const SORT_BUTTON_GAP = 20;
const SORT_BUTTON_BOTTOM = DIARY_BUTTON_BOTTOM + (DIARY_BUTTON_SIZE - SORT_BUTTON_SIZE) / 2;
const SORT_BUBBLE_BOTTOM = SORT_BUTTON_BOTTOM + SORT_BUTTON_SIZE - 10;
const SORT_ICON_SIZE = 35;
const SORT_ICON_GAP = 15;

// Calendar button sits to the right of the diary button, vertically centered on it.
const CALENDAR_BUTTON_SIZE = 100;
const CALENDAR_BUTTON_GAP = 30;
const CALENDAR_BUTTON_BOTTOM = DIARY_BUTTON_BOTTOM + (DIARY_BUTTON_SIZE - CALENDAR_BUTTON_SIZE) / 2;

function pickRandomSubset<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export default function Index() {
  const router = useRouter();
  const { session } = useAuth();
  const { diaries, refresh: refreshDiaries } = useDiaries();
  const [globalEye, setGlobalEye] = useState<EyeVariant>(EYE_VARIANTS[0]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<VoiceDiary | null>(null);
  const [fetchDone, setFetchDone] = useState(false);
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortEmotion, setSortEmotion] = useState<string | null>(null);
  const [gatherPoint, setGatherPoint] = useState<{ token: number; x: number; y: number } | null>(null);
  const translateX = useSharedValue(-PAN_MARGIN);
  const translateY = useSharedValue(-PAN_MARGIN);

  const panGesture = Gesture.Pan().onChange((e) => {
    translateX.value = clamp(translateX.value + e.changeX, -PAN_MARGIN * 2, 0);
    translateY.value = clamp(translateY.value + e.changeY, -PAN_MARGIN * 2, 0);
  });

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  useEffect(() => {
    // user.idが変わった時（サインイン/サインアウト/別ユーザー）だけ保存済みの目を復元する。
    // eye_variant自体を依存に入れると、自分でupdateUserした直後に再同期して選択が揺れ戻る。
    if (session) {
      setGlobalEye(eyeVariantFromMetadata(session.user.user_metadata));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      refreshDiaries().finally(() => setFetchDone(true));
    }, [refreshDiaries]),
  );

  // Random subset (capped at MAX_SHEEP) of whichever diaries currently
  // match the sort filter, drawn from the full list — not just whatever
  // happened to already be roaming.
  const diarySheep = useMemo<SheepEntry[]>(() => {
    const matching = sortEmotion ? diaries.filter((d) => d.emotion === sortEmotion) : diaries;
    return pickRandomSubset(matching, MAX_SHEEP).map((diary) => ({
      id: `diary-${diary.id}`,
      diaryId: diary.id,
      ...diaryToSheepAppearance(diary),
    }));
  }, [diaries, sortEmotion]);

  const handleSheepReady = (id: string) => {
    setReadyIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  // The loading screen must stay up for at least this long, even if the
  // sheep finish loading almost instantly (e.g. an empty or fast-loading
  // account), so it doesn't just flash and disappear.
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!initialLoadDone && fetchDone && readyIds.size >= diarySheep.length && minTimeElapsed) {
      setInitialLoadDone(true);
    }
  }, [fetchDone, readyIds, diarySheep.length, minTimeElapsed, initialLoadDone]);

  const selectEye = (eye: EyeVariant) => {
    setGlobalEye(eye);
    if (session) {
      supabase.auth.updateUser({ data: { eye_variant: eye } });
    }
  };

  const handleSelectEmotion = (emotion: string) => {
    setSortEmotion(emotion);
    translateX.value = -PAN_MARGIN;
    translateY.value = -PAN_MARGIN;
    setGatherPoint({ token: Date.now(), x: HOME_CENTER_X, y: HOME_CENTER_Y });
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.world, worldStyle]}>
          <IsometricBackground />
          {diarySheep.map(({ id, bodyLevel, bodySize, bodyColor, hornColor, hornVariant, rareHorn, diaryId }) => (
            <RoamingSheep
              key={gatherPoint ? `${id}-${gatherPoint.token}` : id}
              bodyLevel={bodyLevel}
              bodySize={bodySize}
              eye={globalEye}
              bodyColor={bodyColor}
              hornColor={hornColor}
              hornVariant={hornVariant}
              rareHorn={rareHorn}
              areaWidth={WORLD_WIDTH}
              areaHeight={WORLD_HEIGHT}
              onPress={() => setSelectedDiary(diaries.find((d) => d.id === diaryId) ?? null)}
              onReady={() => handleSheepReady(id)}
              spawnX={gatherPoint?.x}
              spawnY={gatherPoint?.y}
              highlightQuote={diaries.find((d) => d.id === diaryId)?.highlight_quote}
            />
          ))}
        </Animated.View>
      </GestureDetector>

      {!initialLoadDone && (
        <View style={styles.loadingOverlay}>
          <Image source={CLOSE_BUTTON_SOURCE} style={styles.loadingImage} resizeMode="contain" />
        </View>
      )}

      <View style={styles.bottomPanel} />

      <Pressable style={styles.menuButton} onPress={() => setPreviewVisible(true)}>
        <Text style={styles.menuButtonText}>メニュー</Text>
      </Pressable>

      <Pressable style={styles.diaryButton} onPress={() => router.push("/diary/new")}>
        <Text style={styles.diaryButtonText}>音声日記</Text>
      </Pressable>

      <Pressable style={styles.sortButton} onPress={() => setSortOpen((open) => !open)}>
        <Image
          source={sortOpen ? SORT_BUTTON_ACTIVE_SOURCE : SORT_BUTTON_SOURCE}
          style={styles.sortButtonImage}
          resizeMode="contain"
        />
      </Pressable>

      <Pressable style={styles.calendarButton} onPress={() => router.push("/calendar")}>
        <Image source={CALENDAR_BUTTON_SOURCE} style={styles.calendarButtonImage} resizeMode="contain" />
      </Pressable>

      {sortOpen && (
        <View style={styles.sortBubbleWrap} pointerEvents="box-none">
          <ImageBackground source={SORT_FUKIDASHI_SOURCE} style={styles.sortBubble} resizeMode="stretch">
            <View style={styles.sortIconsRow}>
              {EMOTION_ICON_KEYS.map((key) => (
                <Pressable key={key} onPress={() => handleSelectEmotion(EMOTION_ICON_TO_EMOTION[key])}>
                  <Image source={EMOTION_ICON_SOURCES[key]} style={styles.sortIcon} resizeMode="contain" />
                </Pressable>
              ))}
            </View>
          </ImageBackground>
        </View>
      )}

      <CharacterPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        eye={globalEye}
        onSelectEye={selectEye}
      />

      <DiaryDetailModal diary={selectedDiary} onClose={() => setSelectedDiary(null)} eye={globalEye} />

      {/* Single screen-wide texture layer instead of masking it per sheep —
          masking+recompositing it per sheep every animation frame saturated
          the UI thread once many roaming sheep were on screen at once. */}
      <Image source={PAPER_TEXTURE_SOURCE} resizeMode="repeat" style={styles.textureOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  world: {
    position: "absolute",
    top: 0,
    left: 0,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  loadingImage: {
    width: 60,
    height: 60,
  },
  textureOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    mixBlendMode: TEXTURE_BLEND_MODE,
    pointerEvents: "none",
  },
  menuButton: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "#333",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    zIndex: 9999,
  },
  menuButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: DIARY_BUTTON_BOTTOM + DIARY_BUTTON_SIZE / 2,
    backgroundColor: "#008CFC",
  },
  diaryButton: {
    position: "absolute",
    bottom: DIARY_BUTTON_BOTTOM,
    left: "50%",
    marginLeft: -DIARY_BUTTON_SIZE / 2,
    width: DIARY_BUTTON_SIZE,
    height: DIARY_BUTTON_SIZE,
    borderRadius: DIARY_BUTTON_SIZE / 2,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  diaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  sortButton: {
    position: "absolute",
    bottom: SORT_BUTTON_BOTTOM,
    left: "50%",
    marginLeft: -(DIARY_BUTTON_SIZE / 2 + SORT_BUTTON_GAP + SORT_BUTTON_SIZE),
    width: SORT_BUTTON_SIZE,
    height: SORT_BUTTON_SIZE,
    zIndex: 9999,
  },
  sortButtonImage: {
    width: SORT_BUTTON_SIZE,
    height: SORT_BUTTON_SIZE,
  },
  calendarButton: {
    position: "absolute",
    bottom: CALENDAR_BUTTON_BOTTOM,
    left: "50%",
    marginLeft: DIARY_BUTTON_SIZE / 2 + CALENDAR_BUTTON_GAP,
    width: CALENDAR_BUTTON_SIZE,
    height: CALENDAR_BUTTON_SIZE,
    zIndex: 9999,
  },
  calendarButtonImage: {
    width: CALENDAR_BUTTON_SIZE,
    height: CALENDAR_BUTTON_SIZE,
  },
  sortBubbleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: SORT_BUBBLE_BOTTOM,
    alignItems: "center",
    zIndex: 9999,
  },
  sortBubble: {
    width: 340,
    height: 98,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 25,
  },
  sortIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SORT_ICON_GAP,
  },
  sortIcon: {
    width: SORT_ICON_SIZE,
    height: SORT_ICON_SIZE,
  },
});
