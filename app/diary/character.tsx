import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BodyLevel, BodySize, RareHornKey, SheepSprite } from "../../components/sheep-sprite";
import { useAuth } from "../../contexts/auth-context";
import { eyeVariantFromMetadata } from "../../lib/eye-preference";

const PREVIEW_SCALE = 220 / 256;

export default function CharacterConfirmScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { bodyLevel, bodySize, bodyColor, hornColor, hornVariant, rareHorn } = useLocalSearchParams<{
    bodyLevel: string;
    bodySize: string;
    bodyColor: string;
    hornColor: string;
    hornVariant: string;
    rareHorn?: string;
  }>();
  const eye = eyeVariantFromMetadata(session?.user.user_metadata);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>今日の羊が生まれました</Text>

      <View style={styles.preview}>
        <SheepSprite
          bodyLevel={Number(bodyLevel) as BodyLevel}
          bodySize={Number(bodySize) as BodySize}
          bodyColor={bodyColor}
          hornColor={hornColor}
          hornVariant={Number(hornVariant)}
          rareHorn={rareHorn as RareHornKey | undefined}
          eye={eye}
          state="idle"
          animated={false}
          scale={PREVIEW_SCALE}
        />
      </View>

      <Pressable style={styles.homeButton} onPress={() => router.replace("/")}>
        <Text style={styles.homeButtonText}>ホームに戻る</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 24,
    textAlign: "center",
  },
  preview: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  homeButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 24,
  },
  homeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
