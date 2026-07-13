import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { analyzeVoiceDiary, saveVoiceDiary } from "../../lib/voice-diary-api";

type Phase = "idle" | "recording" | "recorded" | "analyzing";

export default function NewDiaryScreen() {
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startRecording = async () => {
    setErrorMessage(null);
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      setErrorMessage("マイクへのアクセスが許可されていません");
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setPhase("recording");
  };

  const stopRecording = async () => {
    await recorder.stop();
    setPhase("recorded");
  };

  const reRecord = () => {
    setErrorMessage(null);
    setPhase("idle");
  };

  const analyzeAndSave = async () => {
    if (!recorder.uri) return;
    setErrorMessage(null);
    setPhase("analyzing");
    try {
      const result = await analyzeVoiceDiary(recorder.uri, "audio/m4a");
      await saveVoiceDiary(result);
      router.replace("/diary");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "解析に失敗しました");
      setPhase("recorded");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>音声日記を録音</Text>

      <View style={styles.recordArea}>
        <View
          style={[
            styles.recordDot,
            recorderState.isRecording && styles.recordDotActive,
          ]}
        />
        <Text style={styles.status}>
          {phase === "idle" && "録音待機中"}
          {phase === "recording" && "録音中..."}
          {phase === "recorded" && "録音完了"}
          {phase === "analyzing" && "解析中... (数十秒かかることがあります)"}
        </Text>
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {phase === "idle" && (
        <Pressable style={styles.primaryButton} onPress={startRecording}>
          <Text style={styles.buttonText}>録音開始</Text>
        </Pressable>
      )}

      {phase === "recording" && (
        <Pressable
          style={[styles.primaryButton, styles.stopButton]}
          onPress={stopRecording}
        >
          <Text style={styles.buttonText}>停止</Text>
        </Pressable>
      )}

      {phase === "recorded" && (
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={reRecord}>
            <Text style={styles.secondaryButtonText}>録り直す</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, styles.rowButton]}
            onPress={analyzeAndSave}
          >
            <Text style={styles.buttonText}>解析して保存</Text>
          </Pressable>
        </View>
      )}

      {phase === "analyzing" && (
        <View style={[styles.primaryButton, styles.buttonDisabled]}>
          <Text style={styles.buttonText}>解析中...</Text>
        </View>
      )}

      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>閉じる</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 40,
  },
  recordArea: {
    alignItems: "center",
    marginBottom: 32,
  },
  recordDot: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eee",
    marginBottom: 16,
  },
  recordDotActive: {
    backgroundColor: "#E53935",
  },
  status: {
    fontSize: 15,
    color: "#666",
  },
  error: {
    color: "#E53935",
    textAlign: "center",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 24,
  },
  stopButton: {
    backgroundColor: "#E53935",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  rowButton: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: "#333",
    paddingVertical: 14,
    borderRadius: 24,
    flex: 1,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  closeButton: {
    marginTop: 24,
  },
  closeButtonText: {
    color: "#666",
    textAlign: "center",
  },
});
