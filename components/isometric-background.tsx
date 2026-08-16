import { useId } from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

// Distance (px) between grid lines. Adjust this to make the isometric grid
// tighter or wider.
export const ISO_TILE_SIZE = 25;

export const SKY_COLOR = "#f4f9f4";
const LINE_COLOR = "#92DECE";
const LINE_WIDTH = 1;

type IsometricBackgroundProps = {
  width: number;
  height: number;
};

export function IsometricBackground({ width, height }: IsometricBackgroundProps) {
  const tileWidth = ISO_TILE_SIZE * 2;
  const tileHeight = ISO_TILE_SIZE;
  // SVGのidはドキュメント全体で一意である必要がある。固定文字列だと、この
  // コンポーネントが同時に複数マウントされたとき(画面の多重マウントなど)
  // に url(#id)参照が壊れて格子線が消えてしまう。
  const patternId = `iso-grid-${useId()}`;

  return (
    // react-native-svg's web renderer needs numeric width/height on the
    // <Svg> itself — without them the underlying <svg> element falls back
    // to the browser's intrinsic 300x150 default, so a "100%" Rect (and
    // StyleSheet.absoluteFill) only ever fill that small top-left box
    // instead of the whole world.
    <Svg
      width={width}
      height={height}
      style={[styles.background, { pointerEvents: "none" }]}
    >
      <Defs>
        <Pattern id={patternId} patternUnits="userSpaceOnUse" width={tileWidth} height={tileHeight}>
          <Path
            d={`M0,${tileHeight / 2} L${tileWidth / 2},0 L${tileWidth},${tileHeight / 2} L${tileWidth / 2},${tileHeight} Z`}
            stroke={LINE_COLOR}
            strokeWidth={LINE_WIDTH}
            fill="none"
          />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill={SKY_COLOR} />
      <Rect width={width} height={height} fill={`url(#${patternId})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  background: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
