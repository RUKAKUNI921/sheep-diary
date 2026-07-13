import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CharacterPreviewModal } from "../components/character-preview-modal";
import { IsometricBackground } from "../components/isometric-background";
import { RoamingSheep } from "../components/roaming-sheep";
import {
  BODY_COLOR_PRESETS,
  BODY_LEVELS,
  BODY_SIZES,
  BodyLevel,
  BodySize,
  EYE_VARIANTS,
  EyeVariant,
} from "../components/sheep-sprite";
import { useAuth } from "../contexts/auth-context";
import { supabase } from "../lib/supabase";
import { eyeVariantFromMetadata } from "../lib/eye-preference";
import { diaryToSheepAppearance } from "../lib/sheep-mapping";
import { listVoiceDiaries } from "../lib/voice-diary-api";

type SheepEntry = {
  id: string;
  bodyLevel: BodyLevel;
  bodySize: BodySize;
  bodyColor: string;
};

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export default function Index() {
  const router = useRouter();
  const { session } = useAuth();
  const [randomSheep, setRandomSheep] = useState<SheepEntry[]>([]);
  const [diarySheep, setDiarySheep] = useState<SheepEntry[]>([]);
  const [globalEye, setGlobalEye] = useState<EyeVariant>(EYE_VARIANTS[0]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const nextId = useRef(0);

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
        return;
      }
      listVoiceDiaries()
        .then((diaries) => {
          setDiarySheep(
            diaries.map((diary) => ({
              id: `diary-${diary.id}`,
              ...diaryToSheepAppearance(diary),
            })),
          );
        })
        .catch(() => {
          // 羊表示はおまけ機能のため、取得失敗時は静かに無視する
        });
    }, [session]),
  );

  const selectEye = (eye: EyeVariant) => {
    setGlobalEye(eye);
    if (session) {
      supabase.auth.updateUser({ data: { eye_variant: eye } });
    }
  };

  const addRandomSheep = () => {
    setRandomSheep((prev) => [
      ...prev,
      {
        id: `random-${nextId.current++}`,
        bodyLevel: pickRandom(BODY_LEVELS),
        bodySize: pickRandom(BODY_SIZES),
        bodyColor: pickRandom(BODY_COLOR_PRESETS),
      },
    ]);
  };

  const removeAllSheep = () => {
    setRandomSheep([]);
  };

  return (
    <View style={styles.container}>
      <IsometricBackground />
      {[...diarySheep, ...randomSheep].map(
        ({ id, bodyLevel, bodySize, bodyColor }) => (
          <RoamingSheep
            key={id}
            bodyLevel={bodyLevel}
            bodySize={bodySize}
            eye={globalEye}
            bodyColor={bodyColor}
          />
        ),
      )}

      <Pressable
        style={styles.menuButton}
        onPress={() => setPreviewVisible(true)}
      >
        <Text style={styles.menuButtonText}>メニュー</Text>
      </Pressable>

      <Pressable
        style={styles.diaryButton}
        onPress={() => router.push("/diary")}
      >
        <Text style={styles.menuButtonText}>音声日記</Text>
      </Pressable>

      <View style={styles.buttonRow}>
        <Pressable style={styles.button} onPress={addRandomSheep}>
          <Text style={styles.buttonText}>キャラクターを追加</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.removeButton]}
          onPress={removeAllSheep}
        >
          <Text style={styles.buttonText}>すべて削除</Text>
        </Pressable>
      </View>

      <CharacterPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        eye={globalEye}
        onSelectEye={selectEye}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  diaryButton: {
    position: "absolute",
    top: 110,
    right: 20,
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    zIndex: 9999,
  },
  buttonRow: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    gap: 12,
    zIndex: 9999,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  removeButton: {
    backgroundColor: "#E53935",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
