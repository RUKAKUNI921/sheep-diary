import { useEffect, useRef, useState } from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";

const FRAME_SIZE = 300;

export const CHARACTERS = ["normal", "joy", "mad", "sad"] as const;
export type SheepCharacter = (typeof CHARACTERS)[number];
export type SheepAnimationState = "idle" | "walk";

const SHEETS: Record<
  SheepCharacter,
  Record<SheepAnimationState, ImageSourcePropType>
> = {
  normal: {
    idle: require("../assets/spriteSheets/normal_idle.png"),
    walk: require("../assets/spriteSheets/normal_walk.png"),
  },
  joy: {
    idle: require("../assets/spriteSheets/joy_idle.png"),
    walk: require("../assets/spriteSheets/joy_walk.png"),
  },
  mad: {
    idle: require("../assets/spriteSheets/mad_idle.png"),
    walk: require("../assets/spriteSheets/mad_walk.png"),
  },
  sad: {
    idle: require("../assets/spriteSheets/sad_idle.png"),
    walk: require("../assets/spriteSheets/sad_walk.png"),
  },
};

const HEAD_SHEETS: Record<SheepAnimationState, ImageSourcePropType> = {
  idle: require("../assets/spriteSheets/head_idle.png"),
  walk: require("../assets/spriteSheets/head_walk.png"),
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

  const renderLayer = (
    layerKey: string,
    sourceFor: (key: SheepAnimationState) => ImageSourcePropType,
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
            },
          ]}
          resizeMode="stretch"
        />
      );
    });

  return (
    <View style={[styles.viewport, { width: size, height: size }]}>
      {renderLayer("body", (key) => SHEETS[character][key])}
      {renderLayer("head", (key) => HEAD_SHEETS[key])}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    overflow: "hidden",
  },
  sheet: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
