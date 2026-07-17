import { useEffect, useRef, useState } from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";

const FRAME_SIZE = 1080;
const FRAME_COUNT = 6;

export const BODY_LEVELS = [1, 3, 5] as const;
export type BodyLevel = (typeof BODY_LEVELS)[number];

export const BODY_SIZES = [1, 2, 3, 4, 5] as const;
export type BodySize = (typeof BODY_SIZES)[number];

export const EYE_VARIANTS = [
  "hiraku",
  "gurasan",
  "jitome",
  "kawai",
  "kiran",
  "mayuge",
  "megane",
  "nemu",
  "retro",
  "shirome",
] as const;
export type EyeVariant = (typeof EYE_VARIANTS)[number];

export type SheepAnimationState = "idle" | "walk";

const STATES: SheepAnimationState[] = ["idle", "walk"];

// leg, body-tint, body-shade, arm, head, eye, each rendering idle + walk.
const TOTAL_LAYER_IMAGES = 6 * STATES.length;

function sameForBoth(
  source: ImageSourcePropType,
): Record<SheepAnimationState, ImageSourcePropType> {
  return { idle: source, walk: source };
}

// Body doesn't have separate walk art yet, so the same sheet is used for
// both idle and walk.
const BODY_SHEETS: Record<
  BodyLevel,
  Record<BodySize, Record<SheepAnimationState, ImageSourcePropType>>
> = {
  1: {
    1: sameForBoth(require("../assets/character/body/lv1/lv1-sz1.png")),
    2: sameForBoth(require("../assets/character/body/lv1/lv1-sz2.png")),
    3: sameForBoth(require("../assets/character/body/lv1/lv1-sz3.png")),
    4: sameForBoth(require("../assets/character/body/lv1/lv1-sz4.png")),
    5: sameForBoth(require("../assets/character/body/lv1/lv1-sz5.png")),
  },
  3: {
    1: sameForBoth(require("../assets/character/body/lv3/lv3-sz1.png")),
    2: sameForBoth(require("../assets/character/body/lv3/lv3-sz2.png")),
    3: sameForBoth(require("../assets/character/body/lv3/lv3-sz3.png")),
    4: sameForBoth(require("../assets/character/body/lv3/lv3-sz4.png")),
    5: sameForBoth(require("../assets/character/body/lv3/lv3-sz5.png")),
  },
  5: {
    1: sameForBoth(require("../assets/character/body/lv5/lv5-sz1.png")),
    2: sameForBoth(require("../assets/character/body/lv5/lv5-sz2.png")),
    3: sameForBoth(require("../assets/character/body/lv5/lv5-sz3.png")),
    4: sameForBoth(require("../assets/character/body/lv5/lv5-sz4.png")),
    5: sameForBoth(require("../assets/character/body/lv5/lv5-sz5.png")),
  },
};

const ARM_SHEETS: Record<SheepAnimationState, ImageSourcePropType> = {
  idle: require("../assets/character/arm/arm-stop.png"),
  walk: require("../assets/character/arm/arm-walk.png"),
};

const LEG_SHEETS: Record<SheepAnimationState, ImageSourcePropType> = {
  idle: require("../assets/character/leg/leg-stop.png"),
  walk: require("../assets/character/leg/leg-walk.png"),
};

const HEAD_SHEETS = sameForBoth(require("../assets/character/head/head.png"));

const EYE_SHEETS: Record<
  EyeVariant,
  Record<SheepAnimationState, ImageSourcePropType>
> = {
  hiraku: sameForBoth(require("../assets/character/eye/eye-hiraku.png")),
  gurasan: sameForBoth(require("../assets/character/eye/eye-gurasan.png")),
  jitome: sameForBoth(require("../assets/character/eye/eye-jitome.png")),
  kawai: sameForBoth(require("../assets/character/eye/eye-kawai.png")),
  kiran: sameForBoth(require("../assets/character/eye/eye-kiran.png")),
  mayuge: sameForBoth(require("../assets/character/eye/eye-mayuge.png")),
  megane: sameForBoth(require("../assets/character/eye/eye-megane.png")),
  nemu: sameForBoth(require("../assets/character/eye/eye-nemu.png")),
  retro: sameForBoth(require("../assets/character/eye/eye-retro.png")),
  shirome: sameForBoth(require("../assets/character/eye/eye-shirome.png")),
};

const FRAME_DURATIONS_MS: Record<SheepAnimationState, number> = {
  idle: 150,
  walk: 150,
};

// A full walk cycle (all frames once). Movement distance should be a
// multiple of this so a walk always ends back at a neutral pose instead of
// stopping mid-stride.
export const WALK_CYCLE_MS = FRAME_COUNT * FRAME_DURATIONS_MS.walk;

export const DEFAULT_BODY_COLOR = "#FE2C59";

export const BODY_COLOR_PRESETS = [
  "#FE2C59",
  "#FE6FEF",
  "#EBAB2F",
  "#32D27A",
  "#12BFEA",
  "#9731FF",
] as const;

type SheepSpriteProps = {
  bodyLevel: BodyLevel;
  bodySize: BodySize;
  eye: EyeVariant;
  bodyColor?: string;
  state: SheepAnimationState;
  scale?: number;
  onStateChange?: (state: SheepAnimationState) => void;
  // When false, renders a static first frame instead of cycling through the
  // walk/idle animation. Used for thumbnails/previews.
  animated?: boolean;
};

export function SheepSprite({
  bodyLevel,
  bodySize,
  eye,
  bodyColor = DEFAULT_BODY_COLOR,
  state,
  scale = 1,
  onStateChange,
  animated = true,
}: SheepSpriteProps) {
  const [displayState, setDisplayState] = useState(state);
  const [frame, setFrame] = useState(0);
  const targetState = useRef(state);
  targetState.current = state;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const [loadedCount, setLoadedCount] = useState(0);
  const ready = loadedCount >= TOTAL_LAYER_IMAGES;
  const handleImageLoad = () => setLoadedCount((count) => count + 1);

  useEffect(() => {
    if (!animated) return;
    const id = setInterval(() => {
      setFrame((prev) => {
        const next = (prev + 1) % FRAME_COUNT;
        if (next === 0 && targetState.current !== displayState) {
          setDisplayState(targetState.current);
          onStateChangeRef.current?.(targetState.current);
        }
        return next;
      });
    }, FRAME_DURATIONS_MS[displayState]);
    return () => clearInterval(id);
  }, [displayState, animated]);

  const size = FRAME_SIZE * scale;

  const renderFrames = (
    layerKey: string,
    sheets: Record<SheepAnimationState, ImageSourcePropType>,
    tintColor?: string,
  ) =>
    STATES.map((key) => {
      const isActive = key === displayState;
      return (
        <Image
          key={`${layerKey}-${key}`}
          source={sheets[key]}
          onLoad={handleImageLoad}
          style={[
            styles.sheet,
            {
              width: FRAME_SIZE * FRAME_COUNT * scale,
              height: size,
              opacity: isActive ? 1 : 0,
              transform: [{ translateX: -(isActive ? frame : 0) * size }],
              tintColor,
            },
          ]}
          resizeMode="stretch"
        />
      );
    });

  const bodySheets = BODY_SHEETS[bodyLevel][bodySize];

  return (
    <View
      style={[
        styles.viewport,
        { width: size, height: size, opacity: ready ? 1 : 0 },
      ]}
    >
      {/* Rendered back-to-front: leg, body, arm, head, eye. */}
      {renderFrames("leg", LEG_SHEETS)}
      {/* Body color: a solid tint clipped to the sprite's alpha shape, with
          the original shading multiplied on top to keep light/dark detail. */}
      <View style={styles.layer}>
        {renderFrames("body-tint", bodySheets, bodyColor)}
      </View>
      <View style={[styles.layer, styles.multiply]}>
        {renderFrames("body-shade", bodySheets)}
      </View>
      {renderFrames("arm", ARM_SHEETS)}
      {renderFrames("head", HEAD_SHEETS)}
      {renderFrames("eye", EYE_SHEETS[eye])}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    overflow: "hidden",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  multiply: {
    mixBlendMode: "multiply",
  },
  sheet: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
