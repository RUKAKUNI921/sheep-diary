import { useEffect, useRef, useState } from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";

const FRAME_SIZE = 256;
const FRAME_COUNT = 6;

export const BODY_LEVELS = [1, 2, 3, 4, 5] as const;
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

// leg, body-tint, body-shade, arm, horn-tint, horn-shade, head, eye, each
// rendering idle + walk, plus one static shadow image that doesn't animate.
// A rare horn collapses horn-tint/horn-shade into a single "horn" layer
// since it's rendered once instead of via the tint+shade technique.
const NORMAL_LAYER_COUNT = 8;
const RARE_HORN_LAYER_COUNT = 7;

function sameForBoth(source: ImageSourcePropType): Record<SheepAnimationState, ImageSourcePropType> {
  return { idle: source, walk: source };
}

// Body doesn't have separate walk art yet, so the same sheet is used for
// both idle and walk.
const BODY_SHEETS: Record<BodyLevel, Record<BodySize, Record<SheepAnimationState, ImageSourcePropType>>> = {
  1: {
    1: sameForBoth(require("../assets/character/body/lv1/lv1-sz1.png")),
    2: sameForBoth(require("../assets/character/body/lv1/lv1-sz2.png")),
    3: sameForBoth(require("../assets/character/body/lv1/lv1-sz3.png")),
    4: sameForBoth(require("../assets/character/body/lv1/lv1-sz4.png")),
    5: sameForBoth(require("../assets/character/body/lv1/lv1-sz5.png")),
  },
  2: {
    1: sameForBoth(require("../assets/character/body/lv2/lv2-sz1.png")),
    2: sameForBoth(require("../assets/character/body/lv2/lv2-sz2.png")),
    3: sameForBoth(require("../assets/character/body/lv2/lv2-sz3.png")),
    4: sameForBoth(require("../assets/character/body/lv2/lv2-sz4.png")),
    5: sameForBoth(require("../assets/character/body/lv2/lv2-sz5.png")),
  },
  3: {
    1: sameForBoth(require("../assets/character/body/lv3/lv3-sz1.png")),
    2: sameForBoth(require("../assets/character/body/lv3/lv3-sz2.png")),
    3: sameForBoth(require("../assets/character/body/lv3/lv3-sz3.png")),
    4: sameForBoth(require("../assets/character/body/lv3/lv3-sz4.png")),
    5: sameForBoth(require("../assets/character/body/lv3/lv3-sz5.png")),
  },
  4: {
    1: sameForBoth(require("../assets/character/body/lv4/lv4-sz1.png")),
    2: sameForBoth(require("../assets/character/body/lv4/lv4-sz2.png")),
    3: sameForBoth(require("../assets/character/body/lv4/lv4-sz3.png")),
    4: sameForBoth(require("../assets/character/body/lv4/lv4-sz4.png")),
    5: sameForBoth(require("../assets/character/body/lv4/lv4-sz5.png")),
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
  idle: require("../assets/character/arm/arm-idle.png"),
  walk: require("../assets/character/arm/arm-walk.png"),
};

const LEG_SHEETS: Record<SheepAnimationState, ImageSourcePropType> = {
  idle: require("../assets/character/leg/leg-idle.png"),
  walk: require("../assets/character/leg/leg-walk.png"),
};

const HEAD_SHEETS = sameForBoth(require("../assets/character/head/head.png"));

// Horn type is chosen randomly once (at diary-save time) and persisted, so
// the same sheep always shows the same horn. `hornVariant` is 1-indexed to
// match the `horn_variant` DB column.
const HORN_SHEETS: Record<SheepAnimationState, ImageSourcePropType>[] = [
  sameForBoth(require("../assets/character/horn/horn-001.png")),
  sameForBoth(require("../assets/character/horn/horn-002.png")),
  sameForBoth(require("../assets/character/horn/horn-003.png")),
  sameForBoth(require("../assets/character/horn/horn-004.png")),
  sameForBoth(require("../assets/character/horn/horn-005.png")),
  sameForBoth(require("../assets/character/horn/horn-006.png")),
  sameForBoth(require("../assets/character/horn/horn-007.png")),
];

export const HORN_VARIANT_COUNT = HORN_SHEETS.length;

// Rare horns are awarded for specific bodyLevel + emotion + sub_emotion
// combinations (see rareHornForCombo in lib/sheep-mapping.ts) instead of
// being picked randomly. Unlike the default horns, this art is fully
// pre-colored, so it isn't tinted with hornColor.
export const RARE_HORN_KEYS = ["tanpopo", "tenpura", "apple"] as const;
export type RareHornKey = (typeof RARE_HORN_KEYS)[number];

const RARE_HORN_SHEETS: Record<RareHornKey, Record<SheepAnimationState, ImageSourcePropType>> = {
  tanpopo: sameForBoth(require("../assets/character/horn/rare/horn-tanpopo.png")),
  tenpura: sameForBoth(require("../assets/character/horn/rare/horn-tenpura.png")),
  apple: sameForBoth(require("../assets/character/horn/rare/horn-apple.png")),
};

// A single static image, not a 6-frame walk/idle sheet like the other
// layers, so it's rendered separately below instead of via renderFrames.
const SHADOW_SOURCE = require("../assets/character/shadow/shadow.png");

const EYE_SHEETS: Record<EyeVariant, Record<SheepAnimationState, ImageSourcePropType>> = {
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

// Every distinct image file used by SheepSprite, for preloading at app
// startup so sprites don't render blank while their layers decode.
export const SHEEP_ASSET_SOURCES: number[] = [
  ...Object.values(BODY_SHEETS).flatMap((bySize) => Object.values(bySize).map((states) => states.idle)),
  ARM_SHEETS.idle,
  ARM_SHEETS.walk,
  LEG_SHEETS.idle,
  LEG_SHEETS.walk,
  HEAD_SHEETS.idle,
  SHADOW_SOURCE,
  ...HORN_SHEETS.map((states) => states.idle),
  ...Object.values(RARE_HORN_SHEETS).map((states) => states.idle),
  ...Object.values(EYE_SHEETS).map((states) => states.idle),
] as number[];

const FRAME_DURATIONS_MS: Record<SheepAnimationState, number> = {
  idle: 150,
  walk: 150,
};

// A full walk cycle (all frames once). Movement distance should be a
// multiple of this so a walk always ends back at a neutral pose instead of
// stopping mid-stride.
export const WALK_CYCLE_MS = FRAME_COUNT * FRAME_DURATIONS_MS.walk;

export const DEFAULT_BODY_COLOR = "#E5B450";

type SheepSpriteProps = {
  bodyLevel: BodyLevel;
  bodySize: BodySize;
  eye: EyeVariant;
  bodyColor?: string;
  hornColor?: string;
  // 1-indexed into the horn variants. When omitted, a variant is picked at
  // random for the lifetime of this mounted instance (used by previews that
  // aren't backed by a saved diary).
  hornVariant?: number;
  // When set, overrides hornVariant/hornColor with a rare, fully pre-colored
  // horn awarded for a specific bodyLevel + emotion + sub_emotion combo.
  rareHorn?: RareHornKey;
  state: SheepAnimationState;
  scale?: number;
  onStateChange?: (state: SheepAnimationState) => void;
  // When false, renders a static first frame instead of cycling through the
  // walk/idle animation. Used for thumbnails/previews.
  animated?: boolean;
  // Called once all of this sprite's layer images have finished loading.
  onReady?: () => void;
  // When false, the sprite renders immediately instead of staying hidden
  // (opacity 0) until every layer has finished loading. The multi-layer
  // sync that hiding protects against (arms/head popping in before legs)
  // doesn't matter for a single decorative still image.
  hideUntilReady?: boolean;
};

export function SheepSprite({
  bodyLevel,
  bodySize,
  eye,
  bodyColor = DEFAULT_BODY_COLOR,
  hornColor = DEFAULT_BODY_COLOR,
  hornVariant,
  rareHorn,
  state,
  scale = 1,
  onStateChange,
  animated = true,
  onReady,
  hideUntilReady = true,
}: SheepSpriteProps) {
  const [randomHornVariant] = useState(
    () => 1 + Math.floor(Math.random() * HORN_VARIANT_COUNT),
  );
  const hornSheets = HORN_SHEETS[(hornVariant ?? randomHornVariant) - 1];
  const [displayState, setDisplayState] = useState(state);
  const [frame, setFrame] = useState(0);
  const targetState = useRef(state);
  targetState.current = state;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [loadedCount, setLoadedCount] = useState(0);
  const totalLayerImages =
    (rareHorn ? RARE_HORN_LAYER_COUNT : NORMAL_LAYER_COUNT) * STATES.length + 1;
  const ready = loadedCount >= totalLayerImages;
  const handleImageLoad = () => setLoadedCount((count) => count + 1);

  useEffect(() => {
    if (ready) onReadyRef.current?.();
  }, [ready]);

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
  const opacity = !hideUntilReady || ready ? 1 : 0;

  return (
    <View style={[styles.viewport, { width: size, height: size, opacity }]}>
      {/* Rendered back-to-front: shadow, leg, body, arm, horn, head, eye. */}
      <Image
        source={SHADOW_SOURCE}
        onLoad={handleImageLoad}
        style={[styles.sheet, { width: size, height: size }]}
        resizeMode="stretch"
      />
      {renderFrames("leg", LEG_SHEETS)}
      {/* Body color: a solid tint clipped to the sprite's alpha shape, with
          the original shading multiplied on top to keep light/dark detail. */}
      <View style={styles.layer}>{renderFrames("body-tint", bodySheets, bodyColor)}</View>
      <View style={[styles.layer, styles.multiply]}>{renderFrames("body-shade", bodySheets)}</View>
      {renderFrames("arm", ARM_SHEETS)}
      {rareHorn ? (
        // Rare horn art is already fully colored, so it's rendered once
        // as-is instead of the tint+shade technique used for default horns.
        renderFrames("horn", RARE_HORN_SHEETS[rareHorn])
      ) : (
        <>
          {/* Horn color: same solid-tint-plus-multiplied-shading technique as
              the body, so the horn art's own shading/outline still shows. */}
          <View style={styles.layer}>{renderFrames("horn-tint", hornSheets, hornColor)}</View>
          <View style={[styles.layer, styles.multiply]}>{renderFrames("horn-shade", hornSheets)}</View>
        </>
      )}
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
