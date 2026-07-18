import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function SignInScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const { error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    router.replace("/");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>
        {mode === "sign-in" ? "サインイン" : "新規登録"}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="メールアドレス"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="パスワード"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={submit}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {mode === "sign-in" ? "サインイン" : "登録する"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          setMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"))
        }
      >
        <Text style={styles.toggleText}>
          {mode === "sign-in"
            ? "アカウントを作成する"
            : "サインインはこちら"}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#eee",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    color: "#333",
  },
  error: {
    color: "#E53935",
    marginBottom: 12,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
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
  toggleText: {
    color: "#4CAF50",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "600",
  },
});
