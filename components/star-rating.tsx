import { StyleSheet, Text, View } from "react-native";

type StarRatingProps = {
  label: string;
  score: number;
};

export function StarRating({ label, score }: StarRatingProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Text
            key={i}
            style={[styles.star, i <= score && styles.starFilled]}
          >
            ★
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    width: 64,
    fontSize: 13,
    color: "#666",
  },
  stars: {
    flexDirection: "row",
  },
  star: {
    fontSize: 16,
    color: "#ccc",
    marginRight: 2,
  },
  starFilled: {
    color: "#4CAF50",
  },
});
