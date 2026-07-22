import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Dimensions, Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { DiaryDetailModal } from "../components/diary-detail-modal";
import { SheepSprite } from "../components/sheep-sprite";
import { useAuth } from "../contexts/auth-context";
import { useDiaries } from "../contexts/diaries-context";
import { eyeVariantFromMetadata } from "../lib/eye-preference";
import { diaryToSheepAppearance } from "../lib/sheep-mapping";
import { CLOSE_BUTTON_SOURCE, NAV_BUTTON_SOURCE } from "../lib/ui-assets";
import { VoiceDiary } from "../lib/voice-diary-api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMNS = 7;
// Only the header keeps side padding — the grid itself runs edge-to-edge.
const HEADER_PADDING = 12;
const GRID_BOTTOM_MARGIN = 60;
// Floored so 7 cells never sum past the available width due to
// sub-pixel rounding — that rounding was pushing Saturday's cell onto
// the next row instead of staying at the end of its week.
const CELL_WIDTH = Math.floor(SCREEN_WIDTH / COLUMNS);
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const MONTH_NAV_ICON_WIDTH = 20;
const MONTH_NAV_ICON_ASPECT_RATIO = 168 / 172;

function monthGridDays(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) days.push(day);
  while (days.length % COLUMNS !== 0) days.push(null);
  return days;
}

function chunkIntoWeeks(days: (number | null)[]): (number | null)[][] {
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += COLUMNS) weeks.push(days.slice(i, i + COLUMNS));
  return weeks;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const eye = eyeVariantFromMetadata(session?.user.user_metadata);
  const { diaries, hasLoaded, refresh } = useDiaries();
  const [selectedDiary, setSelectedDiary] = useState<VoiceDiary | null>(null);
  const [cursor, setCursor] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  // Measured height of the grid area (screen minus header/weekday row), so
  // cell rows can split it evenly instead of being forced square.
  const [gridHeight, setGridHeight] = useState(0);

  // ホーム画面が毎回リフレッシュしているので、通常はここに来た時点で既に
  // 最新のキャッシュがある。まだ一度も読み込まれていない場合だけ取得する。
  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded) refresh();
    }, [hasLoaded, refresh]),
  );

  const { year, month } = cursor;
  const weeks = useMemo(() => chunkIntoWeeks(monthGridDays(year, month)), [year, month]);
  const cellHeight = gridHeight > 0 ? Math.floor(gridHeight / weeks.length) : CELL_WIDTH;
  // Sheep are rendered oversized and pinned so their center sits on the
  // cell's bottom-right corner, peeking in from the corner; the cell clips
  // the rest via overflow: hidden.
  const sheepDisplaySize = Math.min(CELL_WIDTH, cellHeight) * 1.6;
  const cellSheepScale = sheepDisplaySize / 256;

  const changeMonth = (delta: number) => {
    setCursor(({ year, month }) => {
      const total = year * 12 + month + delta;
      return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
    });
  };

  const handleGridLayout = (e: LayoutChangeEvent) => {
    setGridHeight(e.nativeEvent.layout.height);
  };

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

  // One diary per day across every month (mirroring diaryByDay's per-day
  // dedup, just not limited to the viewed month), sorted chronologically so
  // the modal's prev/next buttons can step across month boundaries.
  const allDiaryByDate = useMemo(() => {
    const map = new Map<string, VoiceDiary>();
    for (const diary of diaries) {
      const created = new Date(diary.created_at);
      const key = `${created.getFullYear()}-${created.getMonth()}-${created.getDate()}`;
      if (!map.has(key)) map.set(key, diary);
    }
    return map;
  }, [diaries]);
  const allOrderedDiaries = useMemo(
    () =>
      Array.from(allDiaryByDate.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [allDiaryByDate],
  );
  const selectedIndex = selectedDiary ? allOrderedDiaries.findIndex((d) => d.id === selectedDiary.id) : -1;

  // Selecting a neighboring diary from the modal may land on a different
  // month than the one currently shown on the grid — follow it there.
  const navigateToDiary = (diary: VoiceDiary) => {
    setSelectedDiary(diary);
    const created = new Date(diary.created_at);
    const diaryYear = created.getFullYear();
    const diaryMonth = created.getMonth();
    if (diaryYear !== year || diaryMonth !== month) {
      setCursor({ year: diaryYear, month: diaryMonth });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Image source={CLOSE_BUTTON_SOURCE} style={styles.closeIcon} resizeMode="contain" />
        </Pressable>

        <View style={styles.monthNav}>
          <Pressable onPress={() => changeMonth(-1)} hitSlop={12}>
            <Image source={NAV_BUTTON_SOURCE} style={styles.monthNavIcon} resizeMode="contain" />
          </Pressable>
          <Text style={styles.monthTitle}>
            {year}年{month + 1}月
          </Text>
          <Pressable onPress={() => changeMonth(1)} hitSlop={12}>
            <Image
              source={NAV_BUTTON_SOURCE}
              style={[styles.monthNavIcon, styles.monthNavIconFlipped]}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        <View style={styles.closeIcon} />
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text
            key={label}
            style={[
              styles.weekdayLabel,
              { width: CELL_WIDTH },
              label === "土" ? { color: "#008CDD" } : null,
              label === "日" ? { color: "#FF4339" } : null,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid} onLayout={handleGridLayout}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              const diary = day ? diaryByDay.get(day) : undefined;
              return (
                <Pressable
                  key={dayIndex}
                  style={[styles.cell, { width: CELL_WIDTH, height: cellHeight }]}
                  disabled={!diary}
                  onPress={() => diary && setSelectedDiary(diary)}
                >
                  {day !== null && <Text style={styles.dayText}>{day}</Text>}
                  {diary && (
                    <View
                      style={[
                        styles.sheepWrap,
                        {
                          left: CELL_WIDTH - sheepDisplaySize / 1.4,
                          top: cellHeight - sheepDisplaySize / 1.05,
                          width: sheepDisplaySize,
                          height: sheepDisplaySize,
                        },
                      ]}
                    >
                      <SheepSprite
                        {...diaryToSheepAppearance(diary)}
                        eye={eye}
                        state="idle"
                        animated={false}
                        scale={cellSheepScale}
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <DiaryDetailModal
        diary={selectedDiary}
        onClose={() => setSelectedDiary(null)}
        eye={eye}
        onPrev={selectedIndex > 0 ? () => navigateToDiary(allOrderedDiaries[selectedIndex - 1]) : undefined}
        onNext={
          selectedIndex >= 0 && selectedIndex < allOrderedDiaries.length - 1
            ? () => navigateToDiary(allOrderedDiaries[selectedIndex + 1])
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F9F4",
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: HEADER_PADDING,
    marginBottom: 16,
  },
  closeIcon: {
    width: 32,
    height: 32,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthNavIcon: {
    width: MONTH_NAV_ICON_WIDTH,
    height: MONTH_NAV_ICON_WIDTH / MONTH_NAV_ICON_ASPECT_RATIO,
  },
  monthNavIconFlipped: {
    transform: [{ scaleX: -1 }],
  },
  monthTitle: {
    fontFamily: "SetoFont",
    fontSize: 24,
    marginTop: 0,
    color: "#000",
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekdayLabel: {
    fontFamily: "SetoFont",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    borderWidth: 1,
    borderColor: "#eee",
    padding: 5,
  },
  grid: {
    flex: 1,
    marginBottom: GRID_BOTTOM_MARGIN,
  },
  weekRow: {
    flexDirection: "row",
  },
  cell: {
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  dayText: {
    position: "absolute",
    top: 4,
    left: 6,
    fontFamily: "SetoFont",
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    zIndex: 1,
  },
  sheepWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
