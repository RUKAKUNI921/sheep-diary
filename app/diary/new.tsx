import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
  CONFIRM_MODAL_SOURCE,
  DOG_ESCORT_SOURCE,
  MIC_BUTTON_RECORDING_SOURCE,
  MIC_BUTTON_SOURCE,
  RECORD_NOW_SIGN_SOURCE,
  SHEEP_CALL_BUTTON_DOWN_SOURCE,
  SHEEP_CALL_BUTTON_SOURCE,
} from "../../lib/ui-assets";
import {
  AnalyzeResult,
  VoiceDiaryAnalysisError,
  analyzeVoiceDiary,
  pickRandomHornVariant,
  retryVoiceDiaryAnalysis,
  saveVoiceDiary,
} from "../../lib/voice-diary-api";

const RECORD_SIGN_WIDTH = 177;
const RECORD_SIGN_HEIGHT = 250;
const RECORD_SIGN_DROP_BOUNCINESS = 4;
const RECORD_SIGN_DROP_SPEED = 3;
const RECORD_SIGN_SWAY_ANGLE_DEG = 4;
const RECORD_SIGN_SWAY_DURATION_MS = 900;

const CONFIRM_MODAL_WIDTH = 305;
// confirm-modal.pngの実寸(929x1154)から、幅固定で比率を保った高さを算出。
const CONFIRM_MODAL_HEIGHT = Math.round((CONFIRM_MODAL_WIDTH * 1154) / 929);
const CONFIRM_MODAL_PADDING = 24;
// confirm-modal.pngは吹き出しの下に尻尾がついている分、実際の丸みを帯びた
// 本体は縦幅いっぱいより少し手前で終わる。paddingだけだとその分テキスト
// ボックスが尻尾側にはみ出すので、下側だけ余分に空ける。
const CONFIRM_MODAL_BOTTOM_INSET = 48;
const CONFIRM_TEXT_INPUT_PADDING = 8;
const CONFIRM_DOG_SIZE = 150;
const CONFIRM_DOG_GAP = 16;
const SHEEP_CALL_BUTTON_WIDTH = 167;
// sheep-call-btn.pngの実寸(513x189 / 押下時513x171)。
const SHEEP_CALL_BUTTON_HEIGHT = Math.round((SHEEP_CALL_BUTTON_WIDTH * 189) / 513);
const SHEEP_CALL_BUTTON_DOWN_HEIGHT = Math.round((SHEEP_CALL_BUTTON_WIDTH * 171) / 513);

type Phase = "idle" | "recording" | "analyzing" | "confirm" | "saving" | "retry";

// UI遷移の確認用に実際のAI解析とDB保存をスキップするフラグ。
// 確認が終わったら false に戻すこと。
const SKIP_AI_ANALYSIS = false;
const MOCK_ANALYSIS_DELAY_MS = 1200;

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
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_ANALYSIS_RESULT), MOCK_ANALYSIS_DELAY_MS));
}

export default function NewDiaryScreen() {
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryJobId, setRetryJobId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResult | null>(null);
  const [transcript, setTranscript] = useState("");
  const [analyzingFrameIndex, setAnalyzingFrameIndex] = useState(0);
  const recordSignY = useRef(new Animated.Value(-RECORD_SIGN_HEIGHT)).current;
  const recordSignSway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== "analyzing") return;
    setAnalyzingFrameIndex(0);
    const id = setInterval(() => {
      setAnalyzingFrameIndex((i) => (i + 1) % ANALYZING_FRAMES.length);
    }, ANALYZING_LOOP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "recording") return;
    recordSignY.setValue(-RECORD_SIGN_HEIGHT);
    recordSignSway.setValue(0);
    Animated.spring(recordSignY, {
      toValue: 0,
      bounciness: RECORD_SIGN_DROP_BOUNCINESS,
      speed: RECORD_SIGN_DROP_SPEED,
      useNativeDriver: true,
    }).start();
    // Ease only at the two extremes (±1) so the swing keeps moving through
    // the center instead of visibly pausing there — a real pendulum is
    // fastest at center, not slowest.
    const sway = Animated.sequence([
      Animated.timing(recordSignSway, {
        toValue: 1,
        duration: RECORD_SIGN_SWAY_DURATION_MS,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordSignSway, {
            toValue: -1,
            duration: RECORD_SIGN_SWAY_DURATION_MS * 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(recordSignSway, {
            toValue: 1,
            duration: RECORD_SIGN_SWAY_DURATION_MS * 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        // Otherwise each iteration boundary snaps the value back to what it
        // was when this loop was constructed (0, before the initial timing
        // even ran), producing a visible jerk once per full swing.
        { resetBeforeIteration: false },
      ),
    ]);
    sway.start();
    return () => sway.stop();
  }, [phase, recordSignY, recordSignSway]);

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
    setRetryJobId(null);
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
      if (err instanceof VoiceDiaryAnalysisError) {
        setRetryJobId(err.jobId);
        setErrorMessage(null);
        setPhase("retry");
      } else {
        setErrorMessage(err instanceof Error ? err.message : "解析に失敗しました");
        setPhase("idle");
      }
    }
  };

  // 音声はすでにアップロード済みなので、録り直さず同じジョブの解析だけやり直す。
  const retryAnalysis = async () => {
    if (!retryJobId) return;
    setErrorMessage(null);
    setPhase("analyzing");

    try {
      const result = await retryVoiceDiaryAnalysis(retryJobId);
      setRetryJobId(null);
      setAnalysisResult(result);
      setTranscript(result.transcribed_text);
      setPhase("confirm");
    } catch (err) {
      if (err instanceof VoiceDiaryAnalysisError) {
        setRetryJobId(err.jobId);
        setErrorMessage(null);
        setPhase("retry");
      } else {
        setErrorMessage(err instanceof Error ? err.message : "解析に失敗しました");
        setPhase("idle");
      }
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
      setErrorMessage(err instanceof Error ? err.message : "保存に失敗しました");
      setPhase("confirm");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {phase === "saving" && (
          <>
            <Text style={styles.title}>音声日記を録音</Text>

            <View style={styles.recordArea}>
              <View style={[styles.recordDot, recorderState.isRecording && styles.recordDotActive]} />
              <Text style={styles.status}>羊を生成中...</Text>
            </View>
          </>
        )}

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {phase === "retry" && (
          <View style={styles.iconArea}>
            <Text style={styles.retryNotice}>解析に時間がかかっています</Text>
            <Pressable onPress={retryAnalysis}>
              <Image source={DOG_ESCORT_SOURCE} style={styles.dogImage} resizeMode="contain" />
            </Pressable>
            <Text style={styles.iconLabel}>もう一度試す</Text>
          </View>
        )}

        {phase === "idle" && (
          <View style={styles.iconArea}>
            <Pressable onPress={startRecording}>
              <Image source={MIC_BUTTON_SOURCE} style={styles.micImage} resizeMode="contain" />
            </Pressable>
            <Text style={styles.iconLabel}>録音すたーと</Text>
          </View>
        )}

        {phase === "recording" && (
          <>
            <Animated.Image
              source={RECORD_NOW_SIGN_SOURCE}
              style={[
                styles.recordSign,
                {
                  transform: [
                    { translateY: recordSignY },
                    {
                      rotate: recordSignSway.interpolate({
                        inputRange: [-1, 1],
                        outputRange: [`-${RECORD_SIGN_SWAY_ANGLE_DEG}deg`, `${RECORD_SIGN_SWAY_ANGLE_DEG}deg`],
                      }),
                    },
                  ],
                },
              ]}
              resizeMode="contain"
            />
            <View style={styles.iconArea}>
              <Pressable onPress={stopRecording}>
                <Image source={MIC_BUTTON_RECORDING_SOURCE} style={styles.micImage} resizeMode="contain" />
              </Pressable>
              <Text style={styles.iconLabel}>録音すとっぷ</Text>
            </View>
          </>
        )}

        {phase === "analyzing" && (
          <View style={styles.iconArea}>
            <Image source={ANALYZING_FRAMES[analyzingFrameIndex]} style={styles.dogImage} resizeMode="contain" />
            <Text style={styles.iconLabel}>準備中...</Text>
          </View>
        )}

        {phase === "confirm" && (
          <View style={styles.confirmContainer}>
            <View style={styles.confirmModal}>
              <Image source={CONFIRM_MODAL_SOURCE} style={styles.confirmModalImage} resizeMode="cover" />
              <View style={styles.confirmModalContent}>
                <Text style={styles.confirmModalTitle}>確認してね</Text>
                <TextInput
                  style={styles.confirmTranscriptInput}
                  value={transcript}
                  onChangeText={setTranscript}
                  multiline
                  placeholder="文字起こし結果"
                />
              </View>
            </View>

            <View style={styles.confirmBottomRow}>
              <Image source={DOG_ESCORT_SOURCE} style={styles.confirmDog} resizeMode="contain" />
              <Pressable onPress={generateSheep} style={styles.confirmCallButton}>
                {({ pressed }) => (
                  <Image
                    source={pressed ? SHEEP_CALL_BUTTON_DOWN_SOURCE : SHEEP_CALL_BUTTON_SOURCE}
                    style={{
                      width: SHEEP_CALL_BUTTON_WIDTH,
                      height: pressed ? SHEEP_CALL_BUTTON_DOWN_HEIGHT : SHEEP_CALL_BUTTON_HEIGHT,
                    }}
                  />
                )}
              </Pressable>
            </View>
          </View>
        )}

        {phase === "saving" && (
          <View style={[styles.primaryButton, styles.buttonDisabled]}>
            <Text style={styles.buttonText}>羊を生成中...</Text>
          </View>
        )}

        {(phase === "idle" || phase === "retry") && (
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
  recordSign: {
    position: "absolute",
    top: -20,
    left: "50%",
    marginLeft: -RECORD_SIGN_WIDTH / 2,
    width: RECORD_SIGN_WIDTH,
    height: RECORD_SIGN_HEIGHT,
    zIndex: 10,
    transformOrigin: "top center",
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
  retryNotice: {
    fontFamily: "SetoFont",
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
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
  confirmContainer: {
    alignItems: "center",
  },
  confirmModal: {
    width: CONFIRM_MODAL_WIDTH,
    height: CONFIRM_MODAL_HEIGHT,
    overflow: "hidden",
  },
  confirmModalImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CONFIRM_MODAL_WIDTH,
    height: CONFIRM_MODAL_HEIGHT,
    zIndex: -1,
  },
  confirmModalContent: {
    flex: 1,
    minHeight: 0,
    paddingTop: CONFIRM_MODAL_PADDING,
    paddingHorizontal: CONFIRM_MODAL_PADDING,
    paddingBottom: CONFIRM_MODAL_BOTTOM_INSET,
    zIndex: 1,
  },
  confirmModalTitle: {
    fontFamily: "SetoFont",
    fontSize: 20,
    color: "#000",
    textAlign: "center",
  },
  confirmTranscriptInput: {
    flex: 1,
    minHeight: 0,
    marginTop: CONFIRM_MODAL_PADDING,
    padding: CONFIRM_TEXT_INPUT_PADDING,
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#333",
    textAlignVertical: "top",
  },
  confirmBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  confirmDog: {
    width: CONFIRM_DOG_SIZE,
    height: CONFIRM_DOG_SIZE,
    transform: [{ scaleX: -1 }],
  },
  confirmCallButton: {
    marginLeft: CONFIRM_DOG_GAP,
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
