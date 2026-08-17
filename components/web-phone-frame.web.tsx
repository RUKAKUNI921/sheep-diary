import { CSSProperties, PropsWithChildren, useEffect, useState } from "react";
import { Image } from "react-native";

import { QR_CODE_SOURCE } from "../lib/ui-assets";

// A recognizable modern-phone viewport (iPhone 14/15-ish).
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const BEZEL = 14;

// Below this real browser width, the app is already about phone-sized (or
// narrower) — render it directly instead of nesting a frame inside itself.
const FRAME_MIN_VIEWPORT_WIDTH = PHONE_WIDTH + 160;

function isEmbeddedInOwnFrame(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access to window.top throws — that also means we're not
    // the outermost page.
    return true;
  }
}

// On a wide desktop browser, renders the app inside a fixed phone-sized
// <iframe> instead of `children` directly. This is the only way to give the
// app a genuinely phone-sized `window` to measure — screens here size
// themselves off the real viewport (Dimensions.get, useWindowDimensions),
// and CSS alone (e.g. a max-width wrapper) doesn't change what those report,
// so a plain scaled/clipped <div> would still lay out for the full desktop
// width inside a phone-sized box. The iframe loads this same page again;
// that inner instance detects it's embedded (window.self !== window.top)
// and renders `children` directly, so the nesting stops at one level.
//
// Starts un-framed on every render (including the first) and only switches
// after mount, so the server-rendered / first-paint output always matches
// between server and client — deciding this from window size up front would
// make that first render depend on browser state the server render can't
// know, which is a hydration mismatch waiting to happen.
export function WebPhoneFrame({ children }: PropsWithChildren) {
  const [shouldFrame, setShouldFrame] = useState(false);

  useEffect(() => {
    if (isEmbeddedInOwnFrame()) return;
    const update = () => setShouldFrame(window.innerWidth >= FRAME_MIN_VIEWPORT_WIDTH);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!shouldFrame) return <>{children}</>;

  return (
    <div style={styles.backdrop}>
      <div style={styles.sidePanel}>
        <p style={styles.leftText}>
          QRコードを読み取って、
          <br />
          スマートフォンからもお試しいただけます
        </p>
        <Image
          source={QR_CODE_SOURCE}
          resizeMode="contain"
          style={{ width: 100, height: 100, marginTop: 40 }}
        />
      </div>

      <div style={styles.frame}>
        <iframe title="sheep-diary" src={window.location.href} style={styles.iframe} />
      </div>

      <div style={{ ...styles.sidePanel, alignItems: "flex-start" }}>
        <p style={styles.rightHeading}>ご利用の際に</p>
        <p style={{ ...styles.rightText, marginTop: 50 }}>
          このプロトタイプは、誰でも体験できるWeb版です。
          <br />
          本来のアプリでは、1日1回の日記を記録する想定ですが、
          <br />
          Web版では体験しやすいよう、1日に複数回記録できます。
        </p>
        <p style={{ ...styles.rightText, marginTop: 50 }}>
          複数の羊を記録した場合、カレンダーには最新の羊が表示され、
          <br />
          すべての羊は牧場に放牧されます。
        </p>
        <p style={{ ...styles.rightNote, marginTop: 50 }}>
          ※注意
          <br />
          Web上で共有されるため、個人的すぎる内容の入力はお控えください。
        </p>
      </div>
    </div>
  );
}

const SIDE_GAP = 200;

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: SIDE_GAP,
    background: "#e5e5e5",
  },
  frame: {
    width: PHONE_WIDTH + BEZEL * 2,
    height: PHONE_HEIGHT + BEZEL * 2,
    padding: BEZEL,
    borderRadius: 48,
    background: "#111",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
    boxSizing: "border-box",
  },
  iframe: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    border: "none",
    borderRadius: 32,
    background: "#fff",
    display: "block",
  },
  sidePanel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'Yu Gothic', sans-serif",
    fontWeight: "bold",
    textAlign: "center",
    margin: 0,
  },
  leftText: {
    fontSize: 16,
    fontFamily: "'Yu Gothic', sans-serif",
    fontWeight: "bold",
    textAlign: "center",
    margin: 0,
  },
  rightHeading: {
    fontSize: 20,
    fontFamily: "'Yu Gothic', sans-serif",
    fontWeight: "bold",
    textAlign: "left",
    margin: 0,
  },
  rightText: {
    fontSize: 16,
    fontFamily: "'Yu Gothic', sans-serif",
    fontWeight: "bold",
    textAlign: "left",
    margin: 0,
  },
  rightNote: {
    fontSize: 14,
    fontFamily: "'Yu Gothic', sans-serif",
    fontWeight: "bold",
    textAlign: "left",
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;
