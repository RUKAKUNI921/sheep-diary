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
import { StarRating } from "../../components/star-rating";
import { useAuth } from "../../contexts/auth-context";
import { listVoiceDiaries, VoiceDiary } from "../../lib/voice-diary-api";

export default function DiaryListScreen() {
  const router = useRouter();
  const { session, isLoading: isAuthLoading } = useAuth();
  const [diaries, setDiaries] = useState<VoiceDiary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmotionBadge emotion={item.emotion} />
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
          </View>
        )}
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
