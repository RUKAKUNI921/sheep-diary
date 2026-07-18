import { Asset } from "expo-asset";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SHEEP_ASSET_SOURCES } from "../components/sheep-sprite";
import { AuthProvider } from "../contexts/auth-context";
import { UI_ASSET_SOURCES } from "../lib/ui-assets";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [assetsReady, setAssetsReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    SetoFont: require("../assets/fonts/setofont.ttf"),
  });
  const ready = assetsReady && (fontsLoaded || !!fontError);

  useEffect(() => {
    Asset.loadAsync([...SHEEP_ASSET_SOURCES, ...UI_ASSET_SOURCES])
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
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
