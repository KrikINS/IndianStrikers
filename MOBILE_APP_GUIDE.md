# Converting IndianStrikers to a Mobile App (Android & iOS)

Since you already have a fully functional React web application, the most efficient way to turn it into a mobile app is using **Capacitor**.

Capacitor allows you to wrap your existing web code (HTML, CSS, JS) into a native container that runs on Android and iOS. You don't need to rewrite your code in React Native.

## Prerequisites

- **Node.js** (You already have this)
- **Android Studio** (For building the Android App)
- **Xcode** (For building the iOS App - Requires a Mac)

## Step 1: Install Capacitor

Stop your development server and run the following commands in your project root:

```bash
npm install @capacitor/core
npm install -D @capacitor/cli
```

## Step 2: Initialize Capacitor

Initialize the capacitor config. You will be asked for:
- **Name**: IndianStrikers
- **Package ID**: com.indianstrikers.app (or similar unique ID)

```bash
npx cap init
```

## Step 3: Add Platforms

Install the android and ios platform packages:

```bash
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
```

## Step 4: Configure `capacitor.config.json`

Ensure your `webDir` is set to `dist` (since you are using Vite). Check `capacitor.config.ts` or `capacitor.config.json`:

```json
{
  "appId": "com.indianstrikers.app",
  "appName": "IndianStrikers",
  "webDir": "dist",
  "bundledWebRuntime": false
}
```

## Step 5: Build Your Web App

You need to generate the static files (HTML/CSS/JS) that the mobile app will load:

```bash
npm run build
```

## Step 6: Sync with Capacitor

Copy your build assets into the native project folders:

```bash
npx cap sync
```

## Step 7: Build & Run

### For Android:
1. Open the Android project:
   ```bash
   npx cap open android
   ```
2. This will launch **Android Studio**.
3. Wait for Gradle to sync.
4. Connect your Android device or set up an Emulator.
5. Click the **Play** (Run) button.

### For iOS (Mac Only):
1. Open the iOS project:
   ```bash
   npx cap open ios
   ```
2. This will launch **Xcode**.
3. Select your target device or simulator.
4. Click the **Play** (Run) button.

## Making Updates
Whenever you change your React code:
1. `npm run build`
2. `npx cap sync`
3. Re-run from Android Studio / Xcode.
