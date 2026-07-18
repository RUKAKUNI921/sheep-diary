import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { BodyLevel, BodySize, EyeVariant, RareHornKey, SheepSprite, WALK_CYCLE_MS } from "./sheep-sprite";

const SHEEP_DISPLAY_SIZE = 150;
const FRAME_SIZE = 256;
const SHEEP_SCALE = SHEEP_DISPLAY_SIZE / FRAME_SIZE;
const SHEEP_SIZE = SHEEP_DISPLAY_SIZE;
const SPEED = 60; // px / sec
const IDLE_MIN_MS = 1600;
const IDLE_MAX_MS = 4000;

// Movement is constrained to the two isometric grid directions (slope
// ±0.5, matching the background grid in isometric-background.tsx).
const ISO_SLOPE = 0.5;
const ISO_LENGTH = Math.sqrt(1 + ISO_SLOPE * ISO_SLOPE);
const ISO_AXES = [
  { x: 1 / ISO_LENGTH, y: ISO_SLOPE / ISO_LENGTH },
  { x: 1 / ISO_LENGTH, y: -ISO_SLOPE / ISO_LENGTH },
];

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// Distance covered by exactly one full walk animation cycle. Movement
// distance is always a whole multiple of this so the walk finishes its
// cycle (back to a neutral pose) at the same instant the sheep stops,
// instead of freezing mid-stride.
const CYCLE_DISTANCE = (SPEED * WALK_CYCLE_MS) / 1000;

// Returns null when the sheep is boxed in (e.g. against a corner) and can't
// fit even one full walk cycle along any isometric direction. Otherwise,
// biases toward directions with more open room so the sheep drifts back out
// of corners/edges over time instead of settling into a tight shuffle there.
function pickIsoTarget(fromX: number, fromY: number, maxX: number, maxY: number) {
  const candidates: { dx: number; dy: number; maxCycles: number }[] = [];

  for (const axis of ISO_AXES) {
    for (const sign of [1, -1]) {
      const dx = axis.x * sign;
      const dy = axis.y * sign;

      const tMaxX = dx > 0 ? (maxX - fromX) / dx : dx < 0 ? fromX / -dx : Infinity;
      const tMaxY = dy > 0 ? (maxY - fromY) / dy : dy < 0 ? fromY / -dy : Infinity;
      const tMax = Math.max(0, Math.min(tMaxX, tMaxY));

      const maxCycles = Math.floor(tMax / CYCLE_DISTANCE);
      if (maxCycles >= 1) candidates.push({ dx, dy, maxCycles });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.maxCycles - a.maxCycles);
  const roomiest = candidates.slice(0, Math.ceil(candidates.length / 2));
  const { dx, dy, maxCycles } = roomiest[Math.floor(Math.random() * roomiest.length)];
  const cycles = 1 + Math.floor(Math.random() * maxCycles);
  const t = cycles * CYCLE_DISTANCE;
  return { x: fromX + dx * t, y: fromY + dy * t };
}

type RoamingSheepProps = {
  bodyLevel: BodyLevel;
  bodySize: BodySize;
  eye: EyeVariant;
  bodyColor: string;
  hornColor: string;
  hornVariant?: number;
  rareHorn?: RareHornKey;
  onPress?: () => void;
  // Size of the area the sheep is allowed to wander in, in the same
  // coordinate space it's positioned in (may be larger than the screen).
  areaWidth: number;
  areaHeight: number;
  // Called once this sheep's sprite has finished loading its images.
  onReady?: () => void;
};

export function RoamingSheep({
  bodyLevel,
  bodySize,
  eye,
  bodyColor,
  hornColor,
  hornVariant,
  rareHorn,
  onPress,
  areaWidth,
  areaHeight,
  onReady,
}: RoamingSheepProps) {
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const currentPos = useRef({ x: 0, y: 0 });
  const [walking, setWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [zIndex, setZIndex] = useState(0);
  const walkStartResolver = useRef<(() => void) | null>(null);

  useEffect(() => {
    const id = position.y.addListener(({ value }) => {
      setZIndex(Math.round(value));
    });
    return () => position.y.removeListener(id);
  }, [position]);

  const handleSpriteStateChange = (state: "idle" | "walk") => {
    if (state === "walk" && walkStartResolver.current) {
      walkStartResolver.current();
      walkStartResolver.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const runLoop = async () => {
      const startX = Math.random() * (areaWidth - SHEEP_SIZE);
      const startY = Math.random() * (areaHeight - SHEEP_SIZE);
      currentPos.current = { x: startX, y: startY };
      position.setValue({ x: startX, y: startY });

      while (!cancelled) {
        setWalking(false);
        await wait(IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS));
        if (cancelled) break;

        const { x: fromX, y: fromY } = currentPos.current;
        const target = pickIsoTarget(
          fromX,
          fromY,
          areaWidth - SHEEP_SIZE,
          areaHeight - SHEEP_SIZE,
        );
        if (!target) {
          // Boxed in against a corner/edge; just wait and try again next
          // cycle instead of starting a near-zero-distance walk.
          continue;
        }
        const { x: targetX, y: targetY } = target;
        const dx = targetX - fromX;
        const dy = targetY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = (distance / SPEED) * 1000;

        setFacingLeft(dx > 0);
        setWalking(true);

        // Wait until the idle animation actually finishes its loop and the
        // sprite switches to the walk frames before moving the sheep. Race
        // against a timeout as a safety net in case the animation callback
        // never fires — otherwise the sheep is left showing the walk
        // animation forever without ever actually moving (looks stuck
        // "walking in place").
        await Promise.race([
          new Promise<void>((resolve) => {
            walkStartResolver.current = resolve;
          }),
          wait(WALK_CYCLE_MS + 500),
        ]);
        walkStartResolver.current = null;
        if (cancelled) break;

        // Race against a timeout as a safety net in case the animation
        // callback never fires (observed to hang the loop forever otherwise).
        await Promise.race([
          new Promise<void>((resolve) => {
            Animated.timing(position, {
              toValue: { x: targetX, y: targetY },
              duration,
              useNativeDriver: true,
            }).start(() => resolve());
          }),
          wait(duration + 1000),
        ]);

        if (cancelled) break;
        currentPos.current = { x: targetX, y: targetY };
      }
    };

    runLoop();
    return () => {
      cancelled = true;
      walkStartResolver.current = null;
    };
  }, [position, areaWidth, areaHeight]);

  return (
    <Animated.View style={[styles.sheepWrapper, { zIndex, transform: position.getTranslateTransform() }]}>
      <Pressable disabled={!onPress} onPress={onPress} style={{ transform: [{ scaleX: facingLeft ? -1 : 1 }] }}>
        <SheepSprite
          bodyLevel={bodyLevel}
          bodySize={bodySize}
          eye={eye}
          bodyColor={bodyColor}
          hornColor={hornColor}
          hornVariant={hornVariant}
          rareHorn={rareHorn}
          state={walking ? "walk" : "idle"}
          scale={SHEEP_SCALE}
          onStateChange={handleSpriteStateChange}
          onReady={onReady}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheepWrapper: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
