import { Asset } from "expo-asset";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SHEEP_ASSET_SOURCES } from "../components/sheep-sprite";
import { WebPhoneFrame } from "../components/web-phone-frame";
import { AuthProvider } from "../contexts/auth-context";
import { DiariesProvider } from "../contexts/diaries-context";
import { EMOTION_ICON_ASSET_SOURCES } from "../lib/emotion-icons";
import { GRASS_ASSET_SOURCES } from "../lib/grass-assets";
import { UI_ASSET_SOURCES } from "../lib/ui-assets";

SplashScreen.preventAutoHideAsync();

// WebPhoneFrame decides, on web, whether to mount RootLayout at all — on a
// wide desktop browser it renders a phone-sized iframe instead, so nothing
// here should run (font/asset loading, gesture handler setup, etc.) until
// that decision is made.
export default function Root() {
  return (
    <WebPhoneFrame>
      <RootLayout />
    </WebPhoneFrame>
  );
}

function RootLayout() {
  const [assetsReady, setAssetsReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    SetoFont: require("../assets/fonts/setofont.ttf"),
  });
  const ready = assetsReady && (fontsLoaded || !!fontError);

  useEffect(() => {
    Asset.loadAsync([
      ...SHEEP_ASSET_SOURCES,
      ...UI_ASSET_SOURCES,
      ...EMOTION_ICON_ASSET_SOURCES,
      ...GRASS_ASSET_SOURCES,
    ])
      .catch(() => {
        // 羊表示はおまけ機能のため、プリロード失敗時も起動をブロックしない
      })
      .finally(() => setAssetsReady(true));
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <DiariesProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* 確認画面→羊登場画面はどちらも背景色が同じで、OS標準の
                スライド遷移だと切り替わり際に前の画面が一瞬透けて見える。
                fadeにして新旧の画面が重ならないようにする。 */}
            <Stack.Screen name="diary/character" options={{ animation: "fade" }} />
          </Stack>
        </DiariesProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
