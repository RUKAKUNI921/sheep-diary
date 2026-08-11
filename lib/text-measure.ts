import { Platform } from "react-native";

let cachedContext: CanvasRenderingContext2D | null | undefined;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (cachedContext !== undefined) return cachedContext;
  cachedContext =
    Platform.OS === "web" && typeof document !== "undefined"
      ? document.createElement("canvas").getContext("2d")
      : null;
  return cachedContext;
}

// The units a browser is allowed to break a line between: ASCII word runs
// stay together, everything else (CJK text has no spaces) is breakable
// character-by-character, matching how the browser actually wraps it.
function breakableUnits(text: string): string[] {
  return text.match(/[A-Za-z0-9'-]+|[^\S\n]+|\n|./gu) ?? [];
}

// react-native-web doesn't implement Text's onTextLayout, so line count
// there can't come from the OS text layout the way it does natively —
// this estimates it instead via canvas text measurement.
export function estimateWebLineCount(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
): number | null {
  const ctx = getMeasureContext();
  if (!ctx) return null;

  ctx.font = `${fontSize}px "${fontFamily}"`;
  let lines = 1;
  let lineWidth = 0;

  for (const unit of breakableUnits(text)) {
    if (unit === "\n") {
      lines++;
      lineWidth = 0;
      continue;
    }
    const unitWidth = ctx.measureText(unit).width;
    const isSpace = /^\s+$/.test(unit);
    if (lineWidth > 0 && lineWidth + unitWidth > maxWidth && !isSpace) {
      lines++;
      lineWidth = unitWidth;
    } else {
      lineWidth += unitWidth;
    }
  }

  return lines;
}
