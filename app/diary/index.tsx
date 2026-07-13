import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EmotionBadge } from "../../components/emotion-badge";
import { SheepSprite } from "../../components/sheep-sprite";
import { StarRating } from "../../components/star-rating";
import { useAuth } from "../../contexts/auth-context";
import { eyeVariantFromMetadata } from "../../lib/eye-preference";
import { diaryToSheepAppearance } from "../../lib/sheep-mapping";
import { listVoiceDiaries, VoiceDiary } from "../../lib/voice-diary-api";

const CARD_SHEEP_SCALE = 70 / 1080;

export default function DiaryListScreen() {
  const router = useRouter();
  const { session, isLoading: isAuthLoading } = useAuth();
  const [diaries, setDiaries] = useState<VoiceDiary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const eye = eyeVariantFromMetadata(session?.user.user_metadata);

  useFocusEffect(
    useCallback(() => {
      if (isAuthLoading) return;
      if (!session) {
        router.replace("/sign-in");
        return;
      }
      setIsLoading(true);
      listVoiceDiaries()
        .then(setDiaries)
        .catch((err) =>
          setErrorMessage(err instanceof Error ? err.message : "読み込みに失敗しました"),
        )
        .finally(() => setIsLoading(false));
    }, [isAuthLoading, session, router]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>戻る</Text>
        </Pressable>
        <Text style={styles.title}>音声日記</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push("/diary/new")}
        >
          <Text style={styles.addButtonText}>＋</Text>
        </Pressable>
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {!isLoading && diaries.length === 0 && (
        <Text style={styles.emptyText}>
          まだ日記がありません。右上の＋から録音してみましょう。
        </Text>
      )}

      <FlatList
        data={diaries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const appearance = diaryToSheepAppearance(item);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <View style={styles.sheepPreview}>
                    <SheepSprite
                      bodyLevel={appearance.bodyLevel}
                      bodySize={appearance.bodySize}
                      bodyColor={appearance.bodyColor}
                      eye={eye}
                      state="idle"
                      scale={CARD_SHEEP_SCALE}
                    />
                  </View>
                  <EmotionBadge emotion={item.emotion} />
                </View>
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleString("ja-JP")}
                </Text>
              </View>
              <Text style={styles.quote}>「{item.highlight_quote}」</Text>
              <View style={styles.stars}>
                <StarRating label="速さ" score={item.speed_score} />
                <StarRating label="間" score={item.pause_score} />
                <StarRating label="量" score={item.volume_score} />
              </View>
              <Text style={styles.transcript}>{item.transcribed_text}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backText: {
    color: "#666",
    fontSize: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  error: {
    color: "#E53935",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 24,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: "#f7f7f7",
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheepPreview: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  transcript: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: "#666",
  },
  date: {
    fontSize: 12,
    color: "#999",
  },
  quote: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  stars: {
    gap: 2,
  },
});
