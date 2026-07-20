import { ImageSourcePropType } from "react-native";
import { EyeVariant } from "../components/sheep-sprite";

export const FACE_IMAGE_SOURCES: Record<EyeVariant, ImageSourcePropType> = {
  hiraku: require("../assets/face/face-hiraku.png"),
  gurasan: require("../assets/face/face-gurasan.png"),
  jitome: require("../assets/face/face-jitome.png"),
  kawai: require("../assets/face/face-kawai.png"),
  kiran: require("../assets/face/face-kiran.png"),
  mayuge: require("../assets/face/face-mayuge.png"),
  megane: require("../assets/face/face-megane.png"),
  nemu: require("../assets/face/face-nemu.png"),
  retro: require("../assets/face/face-retro.png"),
  shirome: require("../assets/face/face-shirome.png"),
};

// Every face preview image, for preloading at app startup.
export const FACE_IMAGE_ASSET_SOURCES: number[] = Object.values(FACE_IMAGE_SOURCES) as number[];
