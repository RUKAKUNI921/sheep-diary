import { useEffect, useState } from "react";
import { Image, ImageBackground, ImageSourcePropType, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { FACE_IMAGE_SOURCES } from "../lib/face-images";
import {
  BACK_BUTTON_DOWN_SOURCE,
  BACK_BUTTON_SOURCE,
  CLOSE_BUTTON_SOURCE,
  CONFIRM_BUTTON_DOWN_SOURCE,
  CONFIRM_BUTTON_SOURCE,
  FACE_BUTTON_DOWN_SOURCE,
  FACE_BUTTON_SOURCE,
  FACE_OPTION_MODAL_SOURCE,
  HOW_TO_USE_BUTTON_DOWN_SOURCE,
  HOW_TO_USE_BUTTON_SOURCE,
  HOW_TO_USE_MODAL_SOURCE,
  LOGIN_BUTTON_DOWN_SOURCE,
  LOGIN_BUTTON_SOURCE,
  LOGOUT_BUTTON_DOWN_SOURCE,
  LOGOUT_BUTTON_SOURCE,
  NAV_BUTTON_SOURCE,
  OPTION_MODAL_SOURCE,
} from "../lib/ui-assets";
import { EYE_VARIANTS, EyeVariant } from "./sheep-sprite";

// Home画面のメニューボタンと揃えるための位置・大きさ。
const CLOSE_BUTTON_TOP = 50;
const CLOSE_BUTTON_RIGHT = 10;
const CLOSE_BUTTON_SIZE = 60;

const MODAL_WIDTH = 267;
const MODAL_HEIGHT = 381;
const MODAL_PADDING_VERTICAL = 40;

const FACE_MODAL_WIDTH = 267;
const FACE_MODAL_HEIGHT = 434;

const HOW_TO_USE_MODAL_WIDTH = 267;
const HOW_TO_USE_MODAL_HEIGHT = 391;

const BUTTON_WIDTH = 167;
const BUTTON_HEIGHT = 59;
const BUTTON_GAP = 24;

// ボタン画像の実寸(513x189 / 押下時513x171)。幅はBUTTON_WIDTHに固定し、
// 高さは比率を変えずに実寸から算出して枠の下端に揃えて表示する。
const BUTTON_IMAGE_HEIGHT = Math.round((BUTTON_WIDTH * 189) / 513);
const BUTTON_IMAGE_DOWN_HEIGHT = Math.round((BUTTON_WIDTH * 171) / 513);

const FACE_IMAGE_SIZE = 150;
const SELECTED_LABEL_GAP = 4;

const ARROW_WIDTH = 25;
// nav-allow.pngの実寸(168x172)から算出した高さ。
const ARROW_HEIGHT = Math.round((ARROW_WIDTH * 172) / 168);
const ARROW_GAP = 12;

const ACTION_BUTTON_WIDTH = 100;
// back/confirm-btnの実寸(307x118 / 押下時307x109)から算出した高さ。
const ACTION_BUTTON_HEIGHT = Math.round((ACTION_BUTTON_WIDTH * 118) / 307);
const ACTION_BUTTON_DOWN_HEIGHT = Math.round((ACTION_BUTTON_WIDTH * 109) / 307);

function cycleIndex(index: number, delta: number, length: number): number {
  return (index + delta + length) % length;
}

type MenuButtonProps = {
  source: ImageSourcePropType;
  downSource: ImageSourcePropType;
  onPress?: () => void;
};

function MenuButton({ source, downSource, onPress }: MenuButtonProps) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={styles.buttonSlot}>
          <Image
            source={pressed ? downSource : source}
            style={{
              width: BUTTON_WIDTH,
              height: pressed ? BUTTON_IMAGE_DOWN_HEIGHT : BUTTON_IMAGE_HEIGHT,
            }}
          />
        </View>
      )}
    </Pressable>
  );
}

type ActionButtonProps = {
  source: ImageSourcePropType;
  downSource: ImageSourcePropType;
  onPress: () => void;
};

function ActionButton({ source, downSource, onPress }: ActionButtonProps) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={styles.actionButtonSlot}>
          <Image
            source={pressed ? downSource : source}
            style={{
              width: ACTION_BUTTON_WIDTH,
              height: pressed ? ACTION_BUTTON_DOWN_HEIGHT : ACTION_BUTTON_HEIGHT,
            }}
          />
        </View>
      )}
    </Pressable>
  );
}

type Screen = "options" | "face" | "how-to-use";

type OptionsModalProps = {
  visible: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  eye: EyeVariant;
  onConfirmFace: (eye: EyeVariant) => void;
  onLogin?: () => void;
  onLogout?: () => void;
};

export function OptionsModal({
  visible,
  onClose,
  isLoggedIn,
  eye,
  onConfirmFace,
  onLogin,
  onLogout,
}: OptionsModalProps) {
  const [screen, setScreen] = useState<Screen>("options");
  const [draftEye, setDraftEye] = useState(eye);

  // 開くたびにオプション画面から、現在の顔からやり直せるようにリセットする。
  useEffect(() => {
    if (visible) {
      setScreen("options");
      setDraftEye(eye);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const draftIndex = EYE_VARIANTS.indexOf(draftEye);
  const cycleFace = (delta: number) => {
    setDraftEye(EYE_VARIANTS[cycleIndex(draftIndex, delta, EYE_VARIANTS.length)]);
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={screen === "face" ? () => setScreen("options") : onClose}
    >
      <View style={styles.backdrop}>
        {screen === "options" ? (
          <ImageBackground source={OPTION_MODAL_SOURCE} style={styles.modalBox} resizeMode="stretch">
            <View style={styles.optionsContent}>
              <Text style={styles.title}>オプション</Text>

              <View style={styles.buttonsColumn}>
                <MenuButton
                  source={FACE_BUTTON_SOURCE}
                  downSource={FACE_BUTTON_DOWN_SOURCE}
                  onPress={() => setScreen("face")}
                />
                <MenuButton
                  source={HOW_TO_USE_BUTTON_SOURCE}
                  downSource={HOW_TO_USE_BUTTON_DOWN_SOURCE}
                  onPress={() => setScreen("how-to-use")}
                />
                <MenuButton
                  source={isLoggedIn ? LOGOUT_BUTTON_SOURCE : LOGIN_BUTTON_SOURCE}
                  downSource={isLoggedIn ? LOGOUT_BUTTON_DOWN_SOURCE : LOGIN_BUTTON_DOWN_SOURCE}
                  onPress={isLoggedIn ? onLogout : onLogin}
                />
              </View>
            </View>
          </ImageBackground>
        ) : screen === "face" ? (
          <ImageBackground source={FACE_OPTION_MODAL_SOURCE} style={styles.faceModalBox} resizeMode="stretch">
            <View style={styles.faceContent}>
              <Text style={styles.title}>かおを変更</Text>

              <View style={styles.faceArea}>
                <Text style={styles.selectedLabel}>選択中のかお</Text>
                <View style={styles.faceRow}>
                  <Pressable onPress={() => cycleFace(-1)} hitSlop={12}>
                    <Image source={NAV_BUTTON_SOURCE} style={styles.arrow} resizeMode="contain" />
                  </Pressable>
                  <Image source={FACE_IMAGE_SOURCES[draftEye]} style={styles.faceImage} resizeMode="contain" />
                  <Pressable onPress={() => cycleFace(1)} hitSlop={12}>
                    <Image
                      source={NAV_BUTTON_SOURCE}
                      style={[styles.arrow, styles.arrowFlipped]}
                      resizeMode="contain"
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <ActionButton
                  source={BACK_BUTTON_SOURCE}
                  downSource={BACK_BUTTON_DOWN_SOURCE}
                  onPress={() => setScreen("options")}
                />
                <ActionButton
                  source={CONFIRM_BUTTON_SOURCE}
                  downSource={CONFIRM_BUTTON_DOWN_SOURCE}
                  onPress={() => onConfirmFace(draftEye)}
                />
              </View>
            </View>
          </ImageBackground>
        ) : (
          <ImageBackground source={HOW_TO_USE_MODAL_SOURCE} style={styles.howToUseModalBox} resizeMode="stretch" />
        )}

        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <Image source={CLOSE_BUTTON_SOURCE} style={styles.closeButtonImage} resizeMode="contain" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    width: MODAL_WIDTH,
    height: MODAL_HEIGHT,
  },
  faceModalBox: {
    width: FACE_MODAL_WIDTH,
    height: FACE_MODAL_HEIGHT,
  },
  howToUseModalBox: {
    width: HOW_TO_USE_MODAL_WIDTH,
    height: HOW_TO_USE_MODAL_HEIGHT,
  },
  optionsContent: {
    flex: 1,
    padding: MODAL_PADDING_VERTICAL,
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
  },
  faceContent: {
    flex: 1,
    paddingVertical: MODAL_PADDING_VERTICAL,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "SetoFont",
    fontSize: 28,
    color: "#000",
  },
  buttonsColumn: {
    alignItems: "center",
    gap: BUTTON_GAP,
  },
  buttonSlot: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  faceArea: {
    alignItems: "center",
  },
  selectedLabel: {
    fontFamily: "SetoFont",
    fontSize: 18,
    color: "#000",
    marginBottom: SELECTED_LABEL_GAP,
  },
  faceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ARROW_GAP,
  },
  faceImage: {
    width: FACE_IMAGE_SIZE,
    height: FACE_IMAGE_SIZE,
  },
  arrow: {
    width: ARROW_WIDTH,
    height: ARROW_HEIGHT,
  },
  arrowFlipped: {
    transform: [{ scaleX: -1 }],
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    alignSelf: "stretch",
  },
  actionButtonSlot: {
    width: ACTION_BUTTON_WIDTH,
    height: ACTION_BUTTON_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: CLOSE_BUTTON_TOP,
    right: CLOSE_BUTTON_RIGHT,
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
  },
  closeButtonImage: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
  },
});
