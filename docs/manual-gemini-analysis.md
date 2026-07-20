# Gemini Web UIで手動解析する手順

APIのレート制限にかからないよう、Gemini API を自動で呼ぶ代わりに、[gemini.google.com](https://gemini.google.com) や [Google AI Studio](https://aistudio.google.com) にあなたが手動で音声とプロンプトを渡し、返ってきたJSONをClaudeに貼り付けて代わりにDBへ保存してもらうためのメモです。

## 手順

1. アプリで音声日記を録音する（`app/diary/new.tsx`）。録音した音声ファイルをそのままGemini Web UIにアップロードする（OSの共有機能などで取り出す）
2. 下記のプロンプトをそのままコピーし、音声ファイルと一緒にGemini Web UIに貼り付ける
3. 返ってきたJSON（コードブロックの中身だけ）をコピーし、Claudeに「これで保存して」と貼り付ける
4. Claude側で `segments` からスコア（速さ・間・量）を計算し、`voice_diaries` テーブルへ直接INSERTする

## コピペ用プロンプト

```
この音声日記を書き起こし、開始・終了時刻（秒, 数値）付きでセグメントに分割してください。
また、日記全体を通して最も支配的だった感情カテゴリを1つ選んでoverall_emotionとしてください。
そのうえで、overall_emotionとは異なる感情がその日記の中で明確に読み取れる場合だけ、
その感情カテゴリを1つ選んでsub_emotionとしてください。
無理にひねり出さず、はっきり読み取れない・overall_emotion以外の感情がほぼ感じられない場合は
sub_emotionをnullにしてください。
日記の中でその日いちばん印象に残った出来事を表す一節を、原文からそのまま15文字以内で抜き出してください
（要約・言い換え禁止。文の一部を切り出すのは可）。
感情や気持ちの説明ではなく、「何があったか」が具体的に伝わる部分を優先してください。

感情カテゴリは次の6つから必ず1つだけ選んでください（他の表現は使わないこと）:
不安・鬱 / 楽しい・嬉しい / 怒り・イライラ / 悲しみ / 安心・平常 / 好き・愛

出力は説明文やMarkdownの前置き・コードフェンスなしで、次の形式のJSONオブジェクトのみを返してください:

{
  "segments": [
    { "start": 0.0, "end": 3.2, "text": "セグメントのテキスト" }
  ],
  "overall_emotion": "楽しい・嬉しい",
  "sub_emotion": "安心・平常",
  "highlight_quote": "その日あった出来事の一節"
}

- segments の start / end は音声内の秒数（数値、文字列にしない）
- overall_emotion は上記6カテゴリのうちいずれか1つの文字列
- sub_emotion は上記6カテゴリのうちoverall_emotionと異なるもの、または明確な副次感情がなければ null
- highlight_quote は原文からの抜き出しで15文字以内
```

## 貼り付けてもらう内容

Gemini からの回答（JSON部分のみ）をそのままClaudeに貼り付けてください。例:

```json
{
  "segments": [
    { "start": 0.0, "end": 4.5, "text": "今日は朝から公園を散歩した。" },
    { "start": 5.0, "end": 9.8, "text": "久しぶりに友達に会えてとても嬉しかった。" }
  ],
  "overall_emotion": "楽しい・嬉しい",
  "sub_emotion": "安心・平常",
  "highlight_quote": "友達に会えてとても嬉しかった"
}
```

`sub_emotion` は明確な副次感情が読み取れないときは `null` を返す前提なので、その場合はClaude側も `voice_diaries.sub_emotion` を `null` のまま保存してください（無理にどれかへ寄せない）。

同じ音声ファイルを本番の自動解析（Edge Function）に投げると、`gemini_response_cache` テーブルに音声ハッシュ単位でキャッシュされ、次回以降は再解析されない点に注意してください。手動解析の結果は自動ではこのキャッシュに入らないため、後で同じ音声をアプリから解析し直すと改めてGemini APIが呼ばれます。

Claude側でこのJSONから `speed_score` / `pause_score` / `volume_score`（各1〜5）を計算し、`transcribed_text`（segmentsの結合）・`emotion`（overall_emotion）・`sub_emotion`・`highlight_quote` とあわせて `voice_diaries` に保存します。スコアの計算ロジックは `supabase/functions/analyze-voice-diary/index.ts` の `computeScores`/`bucketize` と同じものを使います。

- `volume_score`: 全セグメントの文字数合計を閾値 `[150, 230, 285, 330]` で5段階化（実データ15件を5等分するよう調整。元の`[50, 150, 400, 800]`は3段目に集中しすぎていた）
- `speed_score`: 文字数を発話時間で割った速度（文字/秒）を閾値 `[3, 5, 7, 9]` で5段階化
- `pause_score`: 発話時間 ÷ 文字数（1文字あたりの秒数）を閾値 `[0.182, 0.197, 0.213, 0.24]` で5段階化（以前はセグメント間の無音秒数を使っていたが、Geminiの書き起こしが間をほぼ拾わずスコアが動かなかったため変更。閾値も実データ15件を5等分するよう再調整）
