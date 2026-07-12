import { useRef, useState } from "react";
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

type SheepEntry = {
  id: number;
  bodyLevel: BodyLevel;
  bodySize: BodySize;
  eye: EyeVariant;
  bodyColor: string;
};

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export default function Index() {
  const [sheep, setSheep] = useState<SheepEntry[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const nextId = useRef(0);

  const addRandomSheep = () => {
    setSheep((prev) => [
      ...prev,
      {
        id: nextId.current++,
        bodyLevel: pickRandom(BODY_LEVELS),
        bodySize: pickRandom(BODY_SIZES),
        eye: pickRandom(EYE_VARIANTS),
        bodyColor: pickRandom(BODY_COLOR_PRESETS),
      },
    ]);
  };

  const removeAllSheep = () => {
    setSheep([]);
  };

  return (
    <View style={styles.container}>
      <IsometricBackground />
      {sheep.map(({ id, bodyLevel, bodySize, eye, bodyColor }) => (
        <RoamingSheep
          key={id}
          bodyLevel={bodyLevel}
          bodySize={bodySize}
          eye={eye}
          bodyColor={bodyColor}
        />
      ))}

      <Pressable
        style={styles.menuButton}
        onPress={() => setPreviewVisible(true)}
      >
        <Text style={styles.menuButtonText}>メニュー</Text>
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
