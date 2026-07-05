import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RoamingSheep } from "../components/roaming-sheep";
import { CHARACTERS, SheepCharacter } from "../components/sheep-sprite";

type SheepEntry = {
  id: number;
  character: SheepCharacter;
};

export default function Index() {
  const [sheep, setSheep] = useState<SheepEntry[]>([]);
  const nextId = useRef(0);

  const addRandomSheep = () => {
    const character = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    setSheep((prev) => [...prev, { id: nextId.current++, character }]);
  };

  const removeAllSheep = () => {
    setSheep([]);
  };

  return (
    <View style={styles.container}>
      {sheep.map(({ id, character }) => (
        <RoamingSheep key={id} character={character} />
      ))}
      <View style={styles.buttonRow}>
        <Pressable style={styles.button} onPress={addRandomSheep}>
          <Text style={styles.buttonText}>キャラクターを追加</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.removeButton]} onPress={removeAllSheep}>
          <Text style={styles.buttonText}>すべて削除</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  buttonRow: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    gap: 12,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  removeButton: {
    backgroundColor: "#E53935",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
