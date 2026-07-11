import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { SheepCharacter, SheepSprite } from "./sheep-sprite";

const SHEEP_SCALE = 0.3;
const SHEEP_SIZE = 300 * SHEEP_SCALE;
const SPEED = 60; // px / sec
const IDLE_MIN_MS = 800;
const IDLE_MAX_MS = 2000;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type RoamingSheepProps = {
  character: SheepCharacter;
};

export function RoamingSheep({ character }: RoamingSheepProps) {
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
      const { width, height } = Dimensions.get("window");
      const startX = Math.random() * (width - SHEEP_SIZE);
      const startY = Math.random() * (height - SHEEP_SIZE);
      currentPos.current = { x: startX, y: startY };
      position.setValue({ x: startX, y: startY });

      while (!cancelled) {
        setWalking(false);
        await wait(IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS));
        if (cancelled) break;

        const { x: fromX, y: fromY } = currentPos.current;
        const targetX = Math.random() * (width - SHEEP_SIZE);
        const targetY = Math.random() * (height - SHEEP_SIZE);
        const dx = targetX - fromX;
        const dy = targetY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = (distance / SPEED) * 1000;

        setFacingLeft(dx > 0);
        setWalking(true);

        // Wait until the idle animation actually finishes its loop and the
        // sprite switches to the walk frames before moving the sheep.
        await new Promise<void>((resolve) => {
          walkStartResolver.current = resolve;
        });
        if (cancelled) break;

        await new Promise<void>((resolve) => {
          Animated.timing(position, {
            toValue: { x: targetX, y: targetY },
            duration,
            useNativeDriver: true,
          }).start(() => resolve());
        });

        if (cancelled) break;
        currentPos.current = { x: targetX, y: targetY };
      }
    };

    runLoop();
    return () => {
      cancelled = true;
      walkStartResolver.current = null;
    };
  }, [position]);

  return (
    <Animated.View
      style={[
        styles.sheepWrapper,
        { zIndex, transform: position.getTranslateTransform() },
      ]}
    >
      <View style={{ transform: [{ scaleX: facingLeft ? -1 : 1 }] }}>
        <SheepSprite
          character={character}
          state={walking ? "walk" : "idle"}
          scale={SHEEP_SCALE}
          onStateChange={handleSpriteStateChange}
        />
      </View>
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
