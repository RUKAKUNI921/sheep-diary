import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { clamp, Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DiaryDetailModal } from "../components/diary-detail-modal";
import { GrassField } from "../components/grass-field";
import { IsometricBackground } from "../components/isometric-background";
import { OptionsModal } from "../components/options-modal";
import { ROAMING_SHEEP_SIZE, RoamingSheep } from "../components/roaming-sheep";
import { BodyLevel, BodySize, EYE_VARIANTS, EyeVariant, RareHornKey } from "../components/sheep-sprite";
import { useAuth } from "../contexts/auth-context";
import { useDiaries } from "../contexts/diaries-context";
import { supabase } from "../lib/supabase";
import { eyeVariantFromMetadata } from "../lib/eye-preference";
import { usernameFromMetadata } from "../lib/username";
import { EMOTION_ICON_KEYS, EMOTION_ICON_SOURCES, EMOTION_ICON_TO_EMOTION } from "../lib/emotion-icons";
import { diaryToSheepAppearance } from "../lib/sheep-mapping";
import {
  CALENDAR_BUTTON_SOURCE,
  LOADING_LOGO_SOURCE,
  MENU_BUTTON_SOURCE,
  MIC_BUTTON_SOURCE,
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

// Rectangle the sheep are allowed to roam in — the screen plus a PAN_MARGIN
// buffer on every side so panning reveals sheep that were off-screen.
const PAN_MARGIN = 100;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEEP_AREA_WIDTH = SCREEN_WIDTH + PAN_MARGIN * 2;
const SHEEP_AREA_HEIGHT = SCREEN_HEIGHT + PAN_MARGIN * 2;

// Extra pan headroom beyond the sheep's own roam rectangle (1.25 sheep
// widths on every side), so panning all the way out shows some clear space
// past where a sheep could ever be instead of stopping flush against one.
const EXTRA_PAN_MARGIN = ROAMING_SHEEP_SIZE * 0.75;
const WORLD_WIDTH = SHEEP_AREA_WIDTH + EXTRA_PAN_MARGIN * 2;
const WORLD_HEIGHT = SHEEP_AREA_HEIGHT + EXTRA_PAN_MARGIN * 2;

// Max magnitude (and default/home value) of the pan translate.
const PAN_LIMIT = PAN_MARGIN + EXTRA_PAN_MARGIN;

// At most this many diaries become roaming sheep, chosen at random.
const MAX_SHEEP = 10;

// Sheep-local coordinate that sits at the screen center when the pan is at
// its default (home) offset.
const HOME_CENTER_X = SCREEN_WIDTH / 2 + PAN_MARGIN;
const HOME_CENTER_Y = SCREEN_HEIGHT / 2 + PAN_MARGIN;

// Keeps the bottom panel's height in sync with the diary button below.
const DIARY_BUTTON_BOTTOM = 40;
const DIARY_BUTTON_SIZE = 130;
const BOTTOM_PANEL_HEIGHT = DIARY_BUTTON_BOTTOM + DIARY_BUTTON_SIZE / 2;

const MENU_BUTTON_SIZE = 60;

// How much lower than dead-center (relative to the diary button) the sort
// and calendar buttons sit. Bump these up to push a button further down.
const SORT_BUTTON_LOWER_OFFSET = 20;
const CALENDAR_BUTTON_LOWER_OFFSET = 20;

// Sort button sits to the left of the diary button, vertically centered on it.
const SORT_BUTTON_SIZE = 100;
const SORT_BUTTON_GAP = 15;
const SORT_BUTTON_BOTTOM = DIARY_BUTTON_BOTTOM + (DIARY_BUTTON_SIZE - SORT_BUTTON_SIZE) / 2 - SORT_BUTTON_LOWER_OFFSET;
const SORT_BUBBLE_BOTTOM = SORT_BUTTON_BOTTOM + SORT_BUTTON_SIZE - 10;
const SORT_ICON_SIZE = 35;
const SORT_ICON_GAP = 15;

// Calendar button sits to the right of the diary button, vertically centered on it.
const CALENDAR_BUTTON_SIZE = 90;
const CALENDAR_BUTTON_GAP = 15;
const CALENDAR_BUTTON_BOTTOM =
  DIARY_BUTTON_BOTTOM + (DIARY_BUTTON_SIZE - CALENDAR_BUTTON_SIZE) / 2 - CALENDAR_BUTTON_LOWER_OFFSET;

function pickRandomSubset<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// Same as pickRandomSubset, but today's diaries (if any) are always kept in
// the result — the rest of the slots are still filled at random.
function pickRandomSubsetKeepingToday(items: VoiceDiary[], count: number): VoiceDiary[] {
  const today = items.filter((d) => isToday(d.created_at));
  if (today.length >= count) return pickRandomSubset(today, count);
  const rest = items.filter((d) => !isToday(d.created_at));
  return [...today, ...pickRandomSubset(rest, count - today.length)];
}

export default function Index() {
  const router = useRouter();
  const { session } = useAuth();
  const { diaries, refresh: refreshDiaries } = useDiaries();
  const [globalEye, setGlobalEye] = useState<EyeVariant>(EYE_VARIANTS[0]);
  const [globalUsername, setGlobalUsername] = useState<string>("");
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<VoiceDiary | null>(null);
  const [fetchDone, setFetchDone] = useState(false);
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [loadingOverlayVisible, setLoadingOverlayVisible] = useState(true);
  const loadingOpacity = useSharedValue(1);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortEmotion, setSortEmotion] = useState<string | null>(null);
  const [gatherPoint, setGatherPoint] = useState<{
    token: number;
    x: number;
    y: number;
  } | null>(null);
  const translateX = useSharedValue(-PAN_LIMIT);
  const translateY = useSharedValue(-PAN_LIMIT);

  const panGesture = Gesture.Pan().onChange((e) => {
    translateX.value = clamp(translateX.value + e.changeX, -PAN_LIMIT * 2, 0);
    translateY.value = clamp(translateY.value + e.changeY, -PAN_LIMIT * 2, 0);
  });

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const loadingOverlayStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));

  useEffect(() => {
    // user.idが変わった時（サインイン/サインアウト/別ユーザー）だけ保存済みの目を復元する。
    // eye_variant自体を依存に入れると、自分でupdateUserした直後に再同期して選択が揺れ戻る。
    if (session) {
      setGlobalEye(eyeVariantFromMetadata(session.user.user_metadata));
      setGlobalUsername(usernameFromMetadata(session.user.user_metadata));
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
    // Sort mode filters to one emotion and just picks randomly among the
    // matches. Unfiltered (random) mode instead guarantees today's diaries
    // always show up, filling any remaining slots at random.
    const selected = sortEmotion
      ? pickRandomSubset(
          diaries.filter((d) => d.emotion === sortEmotion),
          MAX_SHEEP,
        )
      : pickRandomSubsetKeepingToday(diaries, MAX_SHEEP);
    return selected.map((diary) => ({
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

  // ロード完了後、ロゴをじゅわっと溶かすようにゆっくりフェードアウトさせてから
  // オーバーレイを外す(即消しだとロード完了が唐突に感じるため)。
  useEffect(() => {
    if (!initialLoadDone) return;
    loadingOpacity.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.quad) });
    const timer = setTimeout(() => setLoadingOverlayVisible(false), 900);
    return () => clearTimeout(timer);
  }, [initialLoadDone, loadingOpacity]);

  const selectEye = (eye: EyeVariant) => {
    setGlobalEye(eye);
    if (session) {
      supabase.auth.updateUser({ data: { eye_variant: eye } });
    }
  };

  const selectUsername = (username: string) => {
    setGlobalUsername(username);
    if (session) {
      supabase.auth.updateUser({ data: { username } });
    }
  };

  const handleSelectEmotion = (emotion: string) => {
    setSortEmotion(emotion);
    translateX.value = -PAN_LIMIT;
    translateY.value = -PAN_LIMIT;
    setGatherPoint({ token: Date.now(), x: HOME_CENTER_X, y: HOME_CENTER_Y });
  };

  const toggleSort = () => {
    setSortOpen((open) => {
      const next = !open;
      // ソートを閉じた時は絞り込みも解除して、全日記からのランダム表示に戻す。
      if (!next) setSortEmotion(null);
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.world, worldStyle]}>
          <IsometricBackground />
          <GrassField width={WORLD_WIDTH} height={WORLD_HEIGHT} />
          <View style={styles.sheepArea}>
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
                areaWidth={SHEEP_AREA_WIDTH}
                areaHeight={SHEEP_AREA_HEIGHT}
                onPress={() => setSelectedDiary(diaries.find((d) => d.id === diaryId) ?? null)}
                onReady={() => handleSheepReady(id)}
                spawnX={gatherPoint?.x}
                spawnY={gatherPoint?.y}
                highlightQuote={diaries.find((d) => d.id === diaryId)?.highlight_quote}
              />
            ))}
          </View>
        </Animated.View>
      </GestureDetector>

      {loadingOverlayVisible && (
        <Animated.View
          style={[styles.loadingOverlay, loadingOverlayStyle]}
          pointerEvents={initialLoadDone ? "none" : "auto"}
        >
          <Image source={LOADING_LOGO_SOURCE} style={styles.loadingImage} resizeMode="contain" />
        </Animated.View>
      )}

      <View style={styles.bottomPanel} />

      <Pressable style={styles.menuButton} onPress={() => setOptionsVisible(true)}>
        <Image source={MENU_BUTTON_SOURCE} style={styles.menuButtonImage} resizeMode="contain" />
      </Pressable>

      <Pressable style={styles.diaryButton} onPress={() => router.push("/diary/new")}>
        <Image source={MIC_BUTTON_SOURCE} style={styles.diaryButtonImage} resizeMode="contain" />
      </Pressable>

      <Pressable style={styles.sortButton} onPress={toggleSort}>
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

      <OptionsModal
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        isLoggedIn={!!session}
        eye={globalEye}
        onConfirmFace={(eye) => {
          selectEye(eye);
          setOptionsVisible(false);
        }}
        onLogin={() => {
          setOptionsVisible(false);
          router.push("/sign-in");
        }}
        onLogout={() => {
          setOptionsVisible(false);
          supabase.auth.signOut();
        }}
      />

      <DiaryDetailModal diary={selectedDiary} onClose={() => setSelectedDiary(null)} eye={globalEye} />
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
  sheepArea: {
    position: "absolute",
    left: EXTRA_PAN_MARGIN,
    top: EXTRA_PAN_MARGIN,
    width: SHEEP_AREA_WIDTH,
    height: SHEEP_AREA_HEIGHT,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F4F9F4",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  loadingImage: {
    width: 250,
    height: 250,
  },
  menuButton: {
    position: "absolute",
    top: 50,
    right: 10,
    width: MENU_BUTTON_SIZE,
    height: MENU_BUTTON_SIZE,
    zIndex: 9999,
  },
  menuButtonImage: {
    width: MENU_BUTTON_SIZE,
    height: MENU_BUTTON_SIZE,
  },
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BOTTOM_PANEL_HEIGHT,
    backgroundColor: "#008CFC",
  },
  diaryButton: {
    position: "absolute",
    bottom: DIARY_BUTTON_BOTTOM,
    left: "50%",
    marginLeft: -DIARY_BUTTON_SIZE / 2,
    width: DIARY_BUTTON_SIZE,
    height: DIARY_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  diaryButtonImage: {
    width: DIARY_BUTTON_SIZE,
    height: DIARY_BUTTON_SIZE,
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
