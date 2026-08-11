import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { BodyLevel, BodySize, RareHornKey, SheepSprite, SheepAnimationState } from "../../components/sheep-sprite";
import { useAuth } from "../../contexts/auth-context";
import { eyeVariantFromMetadata } from "../../lib/eye-preference";
import { estimateWebLineCount } from "../../lib/text-measure";
import { BACK_HOME_BUTTON_DOWN_SOURCE, BACK_HOME_BUTTON_SOURCE, FUKIDASHI_SOURCE } from "../../lib/ui-assets";

const HOME_BUTTON_WIDTH = 167;
// back-home-btn.pngの実寸(513x189 / 押下時513x171)。幅は固定し、高さは
// 比率を変えずに実寸から算出して枠の下端に揃えて表示する。
const HOME_BUTTON_HEIGHT = Math.round((HOME_BUTTON_WIDTH * 189) / 513);
const HOME_BUTTON_DOWN_HEIGHT = Math.round((HOME_BUTTON_WIDTH * 171) / 513);

const HIGHLIGHT_TEXT_WIDTH = 136;
const HIGHLIGHT_TEXT_FONT_SIZE = 17;
const HIGHLIGHT_TEXT_FONT_FAMILY = "SetoFont";

const PREVIEW_SIZE = 320;
const PREVIEW_SCALE = PREVIEW_SIZE / 256;
// Entrance-walk speed, in px/sec — tuned for this one-off screen, not tied
// to the roaming sheep's wander speed.
const WALK_SPEED = 120;

export default function CharacterConfirmScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const { bodyLevel, bodySize, bodyColor, hornColor, hornVariant, rareHorn, highlightQuote } = useLocalSearchParams<{
    bodyLevel: string;
    bodySize: string;
    bodyColor: string;
    hornColor: string;
    hornVariant: string;
    rareHorn?: string;
    highlightQuote?: string;
  }>();
  const eye = eyeVariantFromMetadata(session?.user.user_metadata);

  const [spriteState, setSpriteState] = useState<SheepAnimationState>("walk");
  const [arrived, setArrived] = useState(false);
  const [highlightLineCount, setHighlightLineCount] = useState(1);
  const translateX = useRef(new Animated.Value(screenWidth)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;

  // Walk in from the right edge of the screen; once centered, switch to the
  // idle loop, reveal the home button, and pop up the highlight-quote bubble.
  useEffect(() => {
    const duration = (screenWidth / WALK_SPEED) * 1000;
    Animated.timing(translateX, {
      toValue: 0,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setSpriteState("idle");
      setArrived(true);
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(bubbleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [screenWidth, translateX, buttonOpacity, bubbleOpacity]);

  // On native, onTextLayout (below) reports the real line count. On web
  // it never fires at all — react-native-web doesn't implement it — so
  // there we estimate the wrapped line count ourselves instead.
  useEffect(() => {
    if (Platform.OS !== "web" || !highlightQuote) return;
    const estimated = estimateWebLineCount(
      highlightQuote,
      HIGHLIGHT_TEXT_WIDTH,
      HIGHLIGHT_TEXT_FONT_SIZE,
      HIGHLIGHT_TEXT_FONT_FAMILY,
    );
    if (estimated != null) setHighlightLineCount(estimated);
  }, [highlightQuote]);

  return (
    <View style={styles.container}>
      <View style={styles.preview}>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <SheepSprite
            bodyLevel={Number(bodyLevel) as BodyLevel}
            bodySize={Number(bodySize) as BodySize}
            bodyColor={bodyColor}
            hornColor={hornColor}
            hornVariant={Number(hornVariant)}
            rareHorn={rareHorn as RareHornKey | undefined}
            eye={eye}
            state={spriteState}
            animated
            scale={PREVIEW_SCALE}
          />
        </Animated.View>

        {arrived && highlightQuote && (
          <Animated.View style={[styles.fukidashiOverlay, { opacity: bubbleOpacity }]} pointerEvents="none">
            <Image source={FUKIDASHI_SOURCE} style={styles.fukidashi} resizeMode="contain" />
            <Text
              style={[styles.highlight, highlightLineCount === 1 ? styles.highlightOneLine : styles.highlightTwoLines]}
              onTextLayout={(e) => setHighlightLineCount(e.nativeEvent.lines.length)}
            >
              {highlightQuote}
            </Text>
          </Animated.View>
        )}
      </View>

      <Animated.View style={{ opacity: buttonOpacity }} pointerEvents={arrived ? "auto" : "none"}>
        <Pressable onPress={() => router.replace("/")}>
          {({ pressed }) => (
            <View style={styles.homeButtonSlot}>
              <Image
                source={pressed ? BACK_HOME_BUTTON_DOWN_SOURCE : BACK_HOME_BUTTON_SOURCE}
                style={{
                  width: HOME_BUTTON_WIDTH,
                  height: pressed ? HOME_BUTTON_DOWN_HEIGHT : HOME_BUTTON_HEIGHT,
                }}
              />
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F9F4",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  preview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  fukidashiOverlay: {
    position: "absolute",
    top: -20,
    alignItems: "center",
    justifyContent: "center",
  },
  fukidashi: {
    width: 150,
    height: 66,
  },
  highlight: {
    position: "absolute",
    left: 8,
    fontFamily: HIGHLIGHT_TEXT_FONT_FAMILY,
    fontSize: HIGHLIGHT_TEXT_FONT_SIZE,
    lineHeight: HIGHLIGHT_TEXT_FONT_SIZE * 1.2,
    color: "#000",
    width: HIGHLIGHT_TEXT_WIDTH,
    // textAlign: "center",
  },
  // 2行分の高さを前提にバブル内で縦中央になるよう調整済みの位置。1行の
  // ときはその半分だけ下にずらして、同じ基準で中央に来るようにする。
  highlightTwoLines: {
    top: 10,
  },
  highlightOneLine: {
    top: 10 + (HIGHLIGHT_TEXT_FONT_SIZE * 1.2) / 2,
  },
  homeButtonSlot: {
    width: HOME_BUTTON_WIDTH,
    height: HOME_BUTTON_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "center",
  },
});
