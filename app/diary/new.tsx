import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { diaryToSheepAppearance } from "../../lib/sheep-mapping";
import {
  SORT_BUTTON_SOURCE as DOG_FACE_CLOSED_SOURCE,
  SORT_BUTTON_ACTIVE_SOURCE as DOG_FACE_OPEN_SOURCE,
  CLOSE_BUTTON_SOURCE,
  MIC_BUTTON_RECORDING_SOURCE,
  MIC_BUTTON_SOURCE,
} from "../../lib/ui-assets";
import {
  AnalyzeResult,
  analyzeVoiceDiary,
  pickRandomHornVariant,
  saveVoiceDiary,
} from "../../lib/voice-diary-api";

type Phase = "idle" | "recording" | "analyzing" | "confirm" | "saving";

// UI遷移の確認用に実際のAI解析とDB保存をスキップするフラグ。
// 確認が終わったら false に戻すこと。
const SKIP_AI_ANALYSIS = false;
const MOCK_ANALYSIS_DELAY_MS = 800;

// 解析中に表示する犬の顔を切り替える間隔。ここを変えるだけで調整できる。
export const ANALYZING_LOOP_INTERVAL_MS = 500;
const ANALYZING_FRAMES = [DOG_FACE_CLOSED_SOURCE, DOG_FACE_OPEN_SOURCE];
const MOCK_ANALYSIS_RESULT: AnalyzeResult = {
  transcribed_text: "今日は天気が良くて、散歩に行ったらとても気持ちよかった。",
  emotion: "joy",
  sub_emotion: null,
  highlight_quote: "とても気持ちよかった",
  speed_score: 0.5,
  pause_score: 0.5,
  volume_score: 0.5,
};

function mockAnalyzeVoiceDiary(): Promise<AnalyzeResult> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(MOCK_ANALYSIS_RESULT), MOCK_ANALYSIS_DELAY_MS),
  );
}

export default function NewDiaryScreen() {
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResult | null>(
    null,
  );
  const [transcript, setTranscript] = useState("");
  const [analyzingFrameIndex, setAnalyzingFrameIndex] = useState(0);

  useEffect(() => {
    if (phase !== "analyzing") return;
    setAnalyzingFrameIndex(0);
    const id = setInterval(() => {
      setAnalyzingFrameIndex((i) => (i + 1) % ANALYZING_FRAMES.length);
    }, ANALYZING_LOOP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [phase]);

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

  // 録音終了と同時に解析へ進み、完了したら文字起こし確認画面を表示する。
  const stopRecording = async () => {
    await recorder.stop();
    setErrorMessage(null);
    setPhase("analyzing");

    if (!recorder.uri) {
      setErrorMessage("録音データが見つかりません");
      setPhase("idle");
      return;
    }

    try {
      const result = SKIP_AI_ANALYSIS
        ? await mockAnalyzeVoiceDiary()
        : await analyzeVoiceDiary(recorder.uri, "audio/m4a");
      setAnalysisResult(result);
      setTranscript(result.transcribed_text);
      setPhase("confirm");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "解析に失敗しました",
      );
      setPhase("idle");
    }
  };

  const generateSheep = async () => {
    if (!analysisResult) return;
    setErrorMessage(null);
    setPhase("saving");
    try {
      const finalResult: AnalyzeResult = {
        ...analysisResult,
        transcribed_text: transcript,
      };
      const hornVariant = pickRandomHornVariant();
      if (!SKIP_AI_ANALYSIS) {
        await saveVoiceDiary(finalResult, hornVariant);
      }
      const appearance = diaryToSheepAppearance({
        ...finalResult,
        horn_variant: hornVariant,
      });
      router.replace({
        pathname: "/diary/character",
        params: {
          bodyLevel: String(appearance.bodyLevel),
          bodySize: String(appearance.bodySize),
          bodyColor: appearance.bodyColor,
          hornColor: appearance.hornColor,
          hornVariant: String(hornVariant),
          highlightQuote: finalResult.highlight_quote,
          ...(appearance.rareHorn ? { rareHorn: appearance.rareHorn } : {}),
        },
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "保存に失敗しました",
      );
      setPhase("confirm");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {(phase === "confirm" || phase === "saving") && (
          <>
            <Text style={styles.title}>音声日記を録音</Text>

            <View style={styles.recordArea}>
              <View
                style={[
                  styles.recordDot,
                  recorderState.isRecording && styles.recordDotActive,
                ]}
              />
              <Text style={styles.status}>
                {phase === "confirm" && "文字起こしを確認してください"}
                {phase === "saving" && "羊を生成中..."}
              </Text>
            </View>
          </>
        )}

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {phase === "idle" && (
          <View style={styles.iconArea}>
            <Pressable onPress={startRecording}>
              <Image source={MIC_BUTTON_SOURCE} style={styles.micImage} resizeMode="contain" />
            </Pressable>
            <Text style={styles.iconLabel}>すたーと</Text>
          </View>
        )}

        {phase === "recording" && (
          <View style={styles.iconArea}>
            <Pressable onPress={stopRecording}>
              <Image source={MIC_BUTTON_RECORDING_SOURCE} style={styles.micImage} resizeMode="contain" />
            </Pressable>
            <Text style={styles.iconLabel}>すとっぷ</Text>
          </View>
        )}

        {phase === "analyzing" && (
          <View style={styles.iconArea}>
            <Image
              source={ANALYZING_FRAMES[analyzingFrameIndex]}
              style={styles.dogImage}
              resizeMode="contain"
            />
            <Text style={styles.iconLabel}>準備中...</Text>
          </View>
        )}

        {phase === "confirm" && (
          <>
            <TextInput
              style={styles.transcriptInput}
              value={transcript}
              onChangeText={setTranscript}
              multiline
              placeholder="文字起こし結果"
            />
            <Pressable style={styles.primaryButton} onPress={generateSheep}>
              <Text style={styles.buttonText}>羊を生成する</Text>
            </Pressable>
          </>
        )}

        {phase === "saving" && (
          <View style={[styles.primaryButton, styles.buttonDisabled]}>
            <Text style={styles.buttonText}>羊を生成中...</Text>
          </View>
        )}

        {phase === "idle" && (
          <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={12}>
            <Image source={CLOSE_BUTTON_SOURCE} style={styles.closeButtonImage} resizeMode="contain" />
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F9F4",
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
  iconArea: {
    alignItems: "center",
    marginBottom: 32,
  },
  micImage: {
    width: 180,
    height: 180,
  },
  dogImage: {
    width: 230,
    height: 230,
  },
  iconLabel: {
    fontFamily: "SetoFont",
    fontSize: 28,
    color: "#000",
    marginTop: 8,
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
  transcriptInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 15,
    color: "#333",
    marginBottom: 16,
  },
  closeButton: {
    position: "absolute",
    top: 60,
    left: 12,
  },
  closeButtonImage: {
    width: 32,
    height: 32,
  },
});
