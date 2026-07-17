# Gemini Web UIで手動解析する手順

APIのレート制限にかからないよう、Gemini API を自動で呼ぶ代わりに、[gemini.google.com](https://gemini.google.com) や [Google AI Studio](https://aistudio.google.com) にあなたが手動で音声とプロンプトを渡し、返ってきたJSONをClaudeに貼り付けて代わりにDBへ保存してもらうためのメモです。

## 手順

1. アプリで音声日記を録音する（`app/diary/new.tsx`）。録音した音声ファイルをそのままGemini Web UIにアップロードする（OSの共有機能などで取り出す）
2. 下記のプロンプトをそのままコピーし、音声ファイルと一緒にGemini Web UIに貼り付ける
3. 返ってきたJSON（コードブロックの中身だけ）をコピーし、Claudeに「これで保存して」と貼り付ける
4. Claude側で `segments` からスコア（速さ・間・量）を計算し、`voice_diaries` テーブルへ直接INSERTする

## コピペ用プロンプト

```
この音声日記を書き起こし、開始・終了時刻（秒、数値）付きでセグメントに分割してください。
また、日記全体を通して最も支配的だった感情カテゴリを1つだけ選び、
日記の中で最も印象的だった一言を原文からそのまま10文字以内で抜き出してください（要約・言い換え禁止。10文字を超える場合は最も核心的な連続した10文字以内を抜き出す）。

感情カテゴリは次の6つから必ず1つだけ選んでください（他の表現は使わないこと）:
悲しい / 憂鬱 / 恋 / 善 / 楽しい / 怒り

出力は説明文やMarkdownの前置き・コードフェンスなしで、次の形式のJSONオブジェクトのみを返してください:

{
  "segments": [
    { "start": 0.0, "end": 3.2, "text": "セグメントのテキスト" }
  ],
  "overall_emotion": "楽しい",
  "highlight_quote": "最も印象的な一言"
}

- segments の start / end は音声内の秒数（数値、文字列にしない）
- overall_emotion は上記6カテゴリのうちいずれか1つの文字列
- highlight_quote は原文からの抜き出しで10文字以内
```

## 貼り付けてもらう内容

Gemini からの回答（JSON部分のみ）をそのままClaudeに貼り付けてください。例:

```json
{
  "segments": [
    { "start": 0.0, "end": 4.5, "text": "今日は朝から公園を散歩した。" },
    { "start": 5.0, "end": 9.8, "text": "久しぶりに友達に会えてとても嬉しかった。" }
  ],
  "overall_emotion": "楽しい",
  "highlight_quote": "最高だった"
}
```

Claude側でこのJSONから `speed_score` / `pause_score` / `volume_score`（各1〜5）を計算し、`transcribed_text`（segmentsの結合）・`emotion`・`highlight_quote` とあわせて `voice_diaries` に保存します。スコアの計算ロジックは `supabase/functions/analyze-voice-diary/index.ts` の `computeScores`/`bucketize` と同じものを使います。
