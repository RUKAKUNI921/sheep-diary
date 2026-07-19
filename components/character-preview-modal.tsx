import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colorForEmotion, EMOTION_COLORS } from "../lib/emotion-colors";
import { rareHornForCombo } from "../lib/sheep-mapping";
import {
  BODY_LEVELS,
  BODY_SIZES,
  BodyLevel,
  BodySize,
  EYE_VARIANTS,
  EyeVariant,
  SheepAnimationState,
  SheepSprite,
} from "./sheep-sprite";

const PREVIEW_SCALE = 200 / 256;
const EMOTION_NAMES = Object.keys(EMOTION_COLORS);

type CharacterPreviewModalProps = {
  visible: boolean;
  onClose: () => void;
  eye: EyeVariant;
  onSelectEye: (eye: EyeVariant) => void;
};

export function CharacterPreviewModal({
  visible,
  onClose,
  eye,
  onSelectEye,
}: CharacterPreviewModalProps) {
  const [bodySize, setBodySize] = useState<BodySize>(BODY_SIZES[0]);
  const [bodyLevel, setBodyLevel] = useState<BodyLevel>(BODY_LEVELS[0]);
  const [bodyEmotion, setBodyEmotion] = useState<string>(EMOTION_NAMES[0]);
  const [subEmotion, setSubEmotion] = useState<string>(EMOTION_NAMES[0]);
  const [animationState, setAnimationState] =
    useState<SheepAnimationState>("idle");
  const bodyColor = colorForEmotion(bodyEmotion);
  const hornColor = colorForEmotion(subEmotion);
  const rareHorn = rareHornForCombo(bodyLevel, bodyEmotion, subEmotion);

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
              hornColor={hornColor}
              rareHorn={rareHorn}
              state={animationState}
              scale={PREVIEW_SCALE}
              textured
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

            <Text style={styles.label}>目（全ての羊に反映されます）</Text>
            <View style={styles.row}>
              {EYE_VARIANTS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.chip, eye === option && styles.chipActive]}
                  onPress={() => onSelectEye(option)}
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

            <Text style={styles.label}>メイン感情（体の色）</Text>
            <View style={styles.row}>
              {EMOTION_NAMES.map((emotion) => (
                <Pressable
                  key={emotion}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: EMOTION_COLORS[emotion] },
                    bodyEmotion === emotion && styles.colorSwatchActive,
                  ]}
                  onPress={() => setBodyEmotion(emotion)}
                />
              ))}
            </View>

            <Text style={styles.label}>複感情（ツノの色）</Text>
            <View style={styles.row}>
              {EMOTION_NAMES.map((emotion) => (
                <Pressable
                  key={emotion}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: EMOTION_COLORS[emotion] },
                    subEmotion === emotion && styles.colorSwatchActive,
                  ]}
                  onPress={() => setSubEmotion(emotion)}
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
