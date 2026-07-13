import { StyleSheet, Text, View } from "react-native";
import { colorForEmotion } from "../lib/emotion-colors";

export function EmotionBadge({ emotion }: { emotion: string }) {
  const color = colorForEmotion(emotion);
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{emotion}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
  },
});
