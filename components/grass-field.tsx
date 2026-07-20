import { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import { GRASS_SOURCES } from "../lib/grass-assets";
import { ISO_TILE_SIZE } from "./isometric-background";

// Grass art is drawn on a 500x250 (2:1) canvas, so its own bounding-box
// diagonal has exactly the same slope (rise/run = 0.5) as the isometric
// grid's diagonal lines. Laying the image unrotated with one corner
// touching a grid line means that diagonal automatically runs along the
// line for the art's full width, instead of needing any rotation math.
const GRASS_ASPECT_RATIO = 0.5; // height / width

const MIN_WIDTH = ISO_TILE_SIZE * 5;
const MAX_WIDTH = ISO_TILE_SIZE * 10;

// Fixed instead of density-scaled, so the field doesn't balloon into
// hundreds of Images on the larger (screen + pan margin) world rect.
const GRASS_COUNT = 120;

// Uniform vertical nudge applied to every placed grass image, to correct
// for the art's diagonal tuft line not sitting exactly on the image's own
// geometric edge-to-edge diagonal. Positive moves grass down, negative up
// — tweak this by eye against the grid lines.
const GRASS_Y_OFFSET = 4;

type GrassPlacement = {
  key: string;
  source: number;
  x: number;
  y: number;
  width: number;
  height: number;
  flipped: boolean;
};

// Valid diagonal grid lines (both the "\" and "/" families used by
// IsometricBackground) are all of the form y = ±0.5x + c, where c sits
// exactly half a tile off a multiple of ISO_TILE_SIZE.
function gridLineIntercepts(width: number, height: number): number[] {
  const maxC = width * 0.5 + height;
  const intercepts: number[] = [];
  for (let c = -maxC; c <= maxC; c += ISO_TILE_SIZE) {
    intercepts.push(c + ISO_TILE_SIZE / 2);
  }
  return intercepts;
}

function generateGrass(width: number, height: number): GrassPlacement[] {
  const intercepts = gridLineIntercepts(width, height);
  const placements: GrassPlacement[] = [];

  for (let i = 0; i < GRASS_COUNT; i++) {
    const flipped = Math.random() < 0.5;
    const w = MIN_WIDTH + Math.random() * (MAX_WIDTH - MIN_WIDTH);
    const h = w * GRASS_ASPECT_RATIO;
    const c = intercepts[Math.floor(Math.random() * intercepts.length)];
    const x = Math.random() * width;
    // Unflipped ("\"), the diagonal runs from the box's own top-left to
    // bottom-right, so the top-left corner has to sit on y = 0.5x + c.
    // Flipping mirrors it to run top-right-to-bottom-left instead, which
    // works out to the same box needing y = -0.5(x + w) + c.
    const y = flipped ? -0.5 * (x + w) + c : 0.5 * x + c;

    if (y < -h || y > height) continue;

    placements.push({
      key: `grass-${i}`,
      source: GRASS_SOURCES[Math.floor(Math.random() * GRASS_SOURCES.length)],
      x,
      y,
      width: w,
      height: h,
      flipped,
    });
  }

  return placements;
}

type GrassFieldProps = {
  width: number;
  height: number;
};

export function GrassField({ width, height }: GrassFieldProps) {
  const placements = useMemo(() => generateGrass(width, height), [width, height]);

  return (
    <View style={[styles.field, { width, height }]} pointerEvents="none">
      {placements.map((p) => (
        <Image
          key={p.key}
          source={p.source}
          resizeMode="stretch"
          style={[
            styles.grass,
            {
              left: p.x,
              top: p.y + GRASS_Y_OFFSET,
              width: p.width,
              height: p.height,
              transform: [{ scaleX: p.flipped ? -1 : 1 }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  grass: {
    position: "absolute",
  },
});
