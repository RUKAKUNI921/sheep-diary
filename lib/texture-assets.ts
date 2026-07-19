export const PAPER_TEXTURE_SOURCE = require("../assets/textures/texture_paper_002.png");

// Every texture image loaded via require(), for preloading at app startup
// alongside the sheep and UI assets.
export const TEXTURE_ASSET_SOURCES: number[] = [PAPER_TEXTURE_SOURCE];

// Try: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" |
// "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" |
// "exclusion" | "hue" | "saturation" | "color" | "luminosity"
export const TEXTURE_BLEND_MODE = "color-burn";
