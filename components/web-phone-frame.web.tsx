import { CSSProperties, PropsWithChildren, useEffect, useState } from "react";

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
      <div style={styles.frame}>
        <iframe title="sheep-diary" src={window.location.href} style={styles.iframe} />
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
} satisfies Record<string, CSSProperties>;
