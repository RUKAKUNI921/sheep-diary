import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { clamp, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { CharacterPreviewModal } from "../components/character-preview-modal";
import { DiaryDetailModal } from "../components/diary-detail-modal";
import { IsometricBackground } from "../components/isometric-background";
import { RoamingSheep } from "../components/roaming-sheep";
import { BodyLevel, BodySize, EYE_VARIANTS, EyeVariant, RareHornKey } from "../components/sheep-sprite";
import { useAuth } from "../contexts/auth-context";
import { supabase } from "../lib/supabase";
import { eyeVariantFromMetadata } from "../lib/eye-preference";
import { diaryToSheepAppearance } from "../lib/sheep-mapping";
import { CLOSE_BUTTON_SOURCE } from "../lib/ui-assets";
import { listVoiceDiaries, VoiceDiary } from "../lib/voice-diary-api";

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

// Keeps the bottom panel's height in sync with the diary button below.
const DIARY_BUTTON_BOTTOM = 50;
const DIARY_BUTTON_SIZE = 100;

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
  const [diarySheep, setDiarySheep] = useState<SheepEntry[]>([]);
  const [diaries, setDiaries] = useState<VoiceDiary[]>([]);
  const [globalEye, setGlobalEye] = useState<EyeVariant>(EYE_VARIANTS[0]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<VoiceDiary | null>(null);
  const [fetchDone, setFetchDone] = useState(false);
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
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
      if (!session) {
        setDiarySheep([]);
        setDiaries([]);
        setFetchDone(true);
        return;
      }
      listVoiceDiaries()
        .then((fetched) => {
          const selected = pickRandomSubset(fetched, MAX_SHEEP);
          setDiaries(selected);
          setDiarySheep(
            selected.map((diary) => ({
              id: `diary-${diary.id}`,
              diaryId: diary.id,
              ...diaryToSheepAppearance(diary),
            })),
          );
        })
        .catch(() => {
          // 羊表示はおまけ機能のため、取得失敗時は静かに無視する
        })
        .finally(() => setFetchDone(true));
    }, [session]),
  );

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

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.world, worldStyle]}>
          <IsometricBackground />
          {diarySheep.map(({ id, bodyLevel, bodySize, bodyColor, hornColor, hornVariant, rareHorn, diaryId }) => (
            <RoamingSheep
              key={id}
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

      <CharacterPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        eye={globalEye}
        onSelectEye={selectEye}
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
    backgroundColor: "#C7DCD7",
  },
  diaryButton: {
    position: "absolute",
    bottom: DIARY_BUTTON_BOTTOM,
    left: "50%",
    marginLeft: -DIARY_BUTTON_SIZE / 2,
    width: DIARY_BUTTON_SIZE,
    height: DIARY_BUTTON_SIZE,
    borderRadius: DIARY_BUTTON_SIZE / 2,
    backgroundColor: "#4CAF50",
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
});
