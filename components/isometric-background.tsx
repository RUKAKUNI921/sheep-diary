import { StyleSheet } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

// Distance (px) between grid lines. Adjust this to make the isometric grid
// tighter or wider.
export const ISO_TILE_SIZE = 25;

export const SKY_COLOR = "#f4f9f4";
const LINE_COLOR = "#92DECE";
const LINE_WIDTH = 1;

export function IsometricBackground() {
  const tileWidth = ISO_TILE_SIZE * 2;
  const tileHeight = ISO_TILE_SIZE;

  return (
    <Svg style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <Defs>
        <Pattern id="iso-grid" patternUnits="userSpaceOnUse" width={tileWidth} height={tileHeight}>
          <Path
            d={`M0,${tileHeight / 2} L${tileWidth / 2},0 L${tileWidth},${tileHeight / 2} L${tileWidth / 2},${tileHeight} Z`}
            stroke={LINE_COLOR}
            strokeWidth={LINE_WIDTH}
            fill="none"
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={SKY_COLOR} />
      <Rect width="100%" height="100%" fill="url(#iso-grid)" />
    </Svg>
  );
}
