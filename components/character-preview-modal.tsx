import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BODY_COLOR_PRESETS,
  BODY_LEVELS,
  BODY_SIZES,
  BodyLevel,
  BodySize,
  EYE_VARIANTS,
  EyeVariant,
  SheepAnimationState,
  SheepSprite,
} from "./sheep-sprite";

const PREVIEW_SCALE = 200 / 1080;

type CharacterPreviewModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function CharacterPreviewModal({
  visible,
  onClose,
}: CharacterPreviewModalProps) {
  const [eye, setEye] = useState<EyeVariant>(EYE_VARIANTS[0]);
  const [bodySize, setBodySize] = useState<BodySize>(BODY_SIZES[0]);
  const [bodyLevel, setBodyLevel] = useState<BodyLevel>(BODY_LEVELS[0]);
  const [bodyColor, setBodyColor] = useState<string>(BODY_COLOR_PRESETS[0]);
  const [animationState, setAnimationState] =
    useState<SheepAnimationState>("idle");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>キャラクター確認</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeText}>閉じる</Text>
            </Pressable>
          </View>

          <View style={styles.previewArea}>
            <SheepSprite
              bodyLevel={bodyLevel}
              bodySize={bodySize}
              eye={eye}
              bodyColor={bodyColor}
              state={animationState}
              scale={PREVIEW_SCALE}
            />
          </View>

          <ScrollView style={styles.controls}>
            <Text style={styles.label}>状態</Text>
            <View style={styles.row}>
              {(["idle", "walk"] as SheepAnimationState[]).map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.chip,
                    animationState === option && styles.chipActive,
                  ]}
                  onPress={() => setAnimationState(option)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      animationState === option && styles.chipTextActive,
                    ]}
                  >
                    {option === "idle" ? "アイドル" : "歩行"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>目</Text>
            <View style={styles.row}>
              {EYE_VARIANTS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.chip, eye === option && styles.chipActive]}
                  onPress={() => setEye(option)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      eye === option && styles.chipTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>体のサイズ</Text>
            <View style={styles.row}>
              {BODY_SIZES.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.chip,
                    bodySize === option && styles.chipActive,
                  ]}
                  onPress={() => setBodySize(option)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      bodySize === option && styles.chipTextActive,
                    ]}
                  >
                    sz{option}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>体のレベル</Text>
            <View style={styles.row}>
              {BODY_LEVELS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.chip,
                    bodyLevel === option && styles.chipActive,
                  ]}
                  onPress={() => setBodyLevel(option)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      bodyLevel === option && styles.chipTextActive,
                    ]}
                  >
                    lv{option}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>体の色</Text>
            <View style={styles.row}>
              {BODY_COLOR_PRESETS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    bodyColor === color && styles.colorSwatchActive,
                  ]}
                  onPress={() => setBodyColor(color)}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  previewArea: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#eee",
  },
  chipActive: {
    backgroundColor: "#4CAF50",
  },
  chipText: {
    color: "#333",
    fontSize: 13,
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatchActive: {
    borderColor: "#333",
  },
});
