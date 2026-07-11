import { useEffect, useRef, useState } from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";

const FRAME_SIZE = 300;

export const CHARACTERS = ["normal", "joy", "mad", "sad"] as const;
export type SheepCharacter = (typeof CHARACTERS)[number];
export type SheepAnimationState = "idle" | "walk";

export const CHARACTER_COLORS: Record<SheepCharacter, string> = {
  normal: "#63FF80",
  joy: "#FFE063",
  mad: "#FF6366",
  sad: "#63BEFF",
};

const HEAD_SHEETS: Record<SheepAnimationState, ImageSourcePropType> = {
  idle: require("../assets/spriteSheets/head_idle.png"),
  walk: require("../assets/spriteSheets/head_walk.png"),
};

const HORN_SHEETS: Record<SheepAnimationState, ImageSourcePropType> = {
  idle: require("../assets/spriteSheets/horn_idle.png"),
  walk: require("../assets/spriteSheets/horn_walk.png"),
};

const ARM_SHEETS: Record<SheepAnimationState, ImageSourcePropType> = {
  idle: require("../assets/spriteSheets/arm_idle.png"),
  walk: require("../assets/spriteSheets/arm_walk.png"),
};

const BODY_SHEETS: Record<SheepAnimationState, ImageSourcePropType> = {
  idle: require("../assets/spriteSheets/body_idle.png"),
  walk: require("../assets/spriteSheets/body_walk.png"),
};

const LEG_SHEETS: Record<SheepAnimationState, ImageSourcePropType> = {
  idle: require("../assets/spriteSheets/leg_idle.png"),
  walk: require("../assets/spriteSheets/leg_walk.png"),
};

const FRAME_COUNTS: Record<SheepAnimationState, number> = {
  idle: 2,
  walk: 4,
};

const FRAME_DURATIONS_MS: Record<SheepAnimationState, number> = {
  idle: 400,
  walk: 150,
};

const STATES: SheepAnimationState[] = ["idle", "walk"];

type SheepSpriteProps = {
  character: SheepCharacter;
  state: SheepAnimationState;
  scale?: number;
  onStateChange?: (state: SheepAnimationState) => void;
};

export function SheepSprite({
  character,
  state,
  scale = 1,
  onStateChange,
}: SheepSpriteProps) {
  const [displayState, setDisplayState] = useState(state);
  const [frame, setFrame] = useState(0);
  const targetState = useRef(state);
  targetState.current = state;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  useEffect(() => {
    const frameCount = FRAME_COUNTS[displayState];
    const id = setInterval(() => {
      setFrame((prev) => {
        const next = (prev + 1) % frameCount;
        if (next === 0 && targetState.current !== displayState) {
          setDisplayState(targetState.current);
          onStateChangeRef.current?.(targetState.current);
        }
        return next;
      });
    }, FRAME_DURATIONS_MS[displayState]);
    return () => clearInterval(id);
  }, [displayState]);

  const size = FRAME_SIZE * scale;

  const renderFrames = (
    layerKey: string,
    sourceFor: (key: SheepAnimationState) => ImageSourcePropType,
    tintColor?: string,
  ) =>
    STATES.map((key) => {
      const isActive = key === displayState;
      return (
        <Image
          key={`${layerKey}-${key}`}
          source={sourceFor(key)}
          style={[
            styles.sheet,
            {
              width: FRAME_SIZE * FRAME_COUNTS[key] * scale,
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

  // A colored part is rendered as two stacked layers: a solid tint clipped
  // to the sprite's own alpha shape, with the original shading multiplied
  // on top so the light/dark detail from the source art is kept.
  const renderColoredPart = (
    partKey: string,
    sheets: Record<SheepAnimationState, ImageSourcePropType>,
  ) => (
    <>
      <View style={styles.layer}>
        {renderFrames(`${partKey}-tint`, (key) => sheets[key], CHARACTER_COLORS[character])}
      </View>
      <View style={[styles.layer, styles.multiply]}>
        {renderFrames(`${partKey}-shade`, (key) => sheets[key])}
      </View>
    </>
  );

  return (
    <View style={[styles.viewport, { width: size, height: size }]}>
      {/* Rendered back-to-front: leg, body, arm, horn, head. */}
      {renderFrames("leg", (key) => LEG_SHEETS[key])}
      {renderColoredPart("body", BODY_SHEETS)}
      {renderFrames("arm", (key) => ARM_SHEETS[key])}
      {renderColoredPart("horn", HORN_SHEETS)}
      {renderFrames("head", (key) => HEAD_SHEETS[key])}
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
