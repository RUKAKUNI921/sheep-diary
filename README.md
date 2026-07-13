# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## 音声日記機能

音声日記の解析には Gemini API（`gemini-2.5-flash` / 開発時は `gemini-2.5-flash-lite`）を使用しています。Gemini APIキーは Supabase Edge Function (`supabase/functions/analyze-voice-diary`) のシークレットとして設定してください（クライアントには一切埋め込みません）。

```bash
supabase secrets set GEMINI_API_KEY=xxx --project-ref fuvwumwegtvrvvtsiash
# モデルを切り替える場合
supabase secrets set GEMINI_MODEL=gemini-2.5-flash-lite --project-ref fuvwumwegtvrvvtsiash
```

Gemini APIの無料枠を利用する場合、送信した音声データがモデルの学習改善に利用される場合があります。詳細は [Gemini API利用規約](https://ai.google.dev/gemini-api/terms) を確認してください。

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
