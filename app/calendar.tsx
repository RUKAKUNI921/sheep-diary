import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { DiaryDetailModal } from "../components/diary-detail-modal";
import { SheepSprite } from "../components/sheep-sprite";
import { useAuth } from "../contexts/auth-context";
import { useDiaries } from "../contexts/diaries-context";
import { eyeVariantFromMetadata } from "../lib/eye-preference";
import { diaryToSheepAppearance } from "../lib/sheep-mapping";
import { CLOSE_BUTTON_SOURCE } from "../lib/ui-assets";
import { VoiceDiary } from "../lib/voice-diary-api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMNS = 7;
const GRID_PADDING = 12;
const CELL_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2) / COLUMNS;
const CELL_SHEEP_SCALE = (CELL_SIZE * 0.8) / 256;
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function monthGridDays(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) days.push(day);
  while (days.length % COLUMNS !== 0) days.push(null);
  return days;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const eye = eyeVariantFromMetadata(session?.user.user_metadata);
  const { diaries, hasLoaded, refresh } = useDiaries();
  const [selectedDiary, setSelectedDiary] = useState<VoiceDiary | null>(null);

  // ホーム画面が毎回リフレッシュしているので、通常はここに来た時点で既に
  // 最新のキャッシュがある。まだ一度も読み込まれていない場合だけ取得する。
  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded) refresh();
    }, [hasLoaded, refresh]),
  );

  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const month = today.getMonth();
  const days = useMemo(() => monthGridDays(year, month), [year, month]);

  const diaryByDay = useMemo(() => {
    const map = new Map<number, VoiceDiary>();
    for (const diary of diaries) {
      const created = new Date(diary.created_at);
      if (created.getFullYear() === year && created.getMonth() === month) {
        const day = created.getDate();
        if (!map.has(day)) map.set(day, diary);
      }
    }
    return map;
  }, [diaries, year, month]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Image source={CLOSE_BUTTON_SOURCE} style={styles.closeIcon} resizeMode="contain" />
        </Pressable>
        <Text style={styles.monthTitle}>
          {year}年{month + 1}月
        </Text>
        <View style={styles.closeIcon} />
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={[styles.weekdayLabel, { width: CELL_SIZE }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day, index) => {
          const diary = day ? diaryByDay.get(day) : undefined;
          return (
            <Pressable
              key={index}
              style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}
              disabled={!diary}
              onPress={() => diary && setSelectedDiary(diary)}
            >
              {day !== null && <Text style={styles.dayText}>{day}</Text>}
              {diary && (
                <View style={styles.sheepWrap}>
                  <SheepSprite
                    {...diaryToSheepAppearance(diary)}
                    eye={eye}
                    state="idle"
                    animated={false}
                    scale={CELL_SHEEP_SCALE}
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <DiaryDetailModal diary={selectedDiary} onClose={() => setSelectedDiary(null)} eye={eye} />
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
    paddingHorizontal: GRID_PADDING,
    marginBottom: 16,
  },
  closeIcon: {
    width: 32,
    height: 32,
  },
  monthTitle: {
    fontFamily: "SetoFont",
    fontSize: 22,
    color: "#000",
  },
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: GRID_PADDING,
  },
  weekdayLabel: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: GRID_PADDING,
  },
  cell: {
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    position: "absolute",
    top: 4,
    left: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
  },
  sheepWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
