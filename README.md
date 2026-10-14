# Scribble Squad

A real-time multiplayer drawing-and-guessing game built with Node.js, Socket.IO, and React Native (CLI).

## Project Structure
- `backend/`: Node.js, Express, Socket.IO backend.
- `mobile/`: React Native CLI Android application.
- `shared/`: Shared Typescript types.

## Setup & Running

### (A) Local Wi-Fi Play (No Hosting)

#### 1. Backend Setup
1. Open a terminal in the `backend` folder.
2. Run `npm install`.
3. Run `npm run dev` to start the server.
4. Find your laptop's local IP address (e.g., `192.168.1.15`). You can find this by running `ipconfig` (Windows) or `ifconfig` (Mac/Linux).
5. **Important**: Allow port 3000 through your firewall.

#### 2. Mobile App Setup (Physical Android Device)
1. Enable **Developer Options** and **USB Debugging** on your Android phone.
2. Connect your phone via USB.
3. Open a terminal and run `adb devices` to verify the connection.
4. If testing via USB cable to localhost, run `adb reverse tcp:3000 tcp:3000`.
5. Open a terminal in the `mobile` folder.
6. Run `npm install`.
7. Run `npm start` to start the Metro bundler.
8. In another terminal, run `npx react-native run-android`.
9. Once the app launches, enter your server address. For USB testing, use `http://localhost:3000`. For Wi-Fi testing (phone on same network), use `http://YOUR_LOCAL_IP:3000`.

### (B) Online Play (Render Deployment)
This project is configured to deploy the backend automatically to Render from GitHub.

1. Push this repository to GitHub.
2. Log into [Render](https://render.com) and click "New Web Service".
3. Connect your GitHub repository.
4. The service will automatically configure itself using `render.yaml`.
5. No API keys or secrets are required. The free instance will sleep after 15 minutes of inactivity. When you open the app, it may take ~50 seconds for the server to wake up.
6. In the mobile app, use your Render URL (e.g., `https://scribble-squad-backend.onrender.com`).
7. To share the app with friends, build the release APK:
   ```bash
   cd mobile/android
   ./gradlew assembleRelease
   ```
   Install the APK on devices: `adb install -r app/build/outputs/apk/release/app-release.apk`.

## Features
- **Real-time Drawing**: 60fps drawing synchronized across all devices using `@shopify/react-native-skia` and `socket.io`.
- **Game Engine**: Server-authoritative logic for turn management, hints, scoring, and word validation (Levenshtein distance).
- **Anti-Cheat**: Words are never sent to non-drawing clients, and chat filtering prevents cheating.

## Assumptions & Limitations
- State is entirely in memory; Redis is not required.
- Android-only React Native CLI as specified.
- The `npx @react-native-community/cli init` might require specific Android Studio setup to build successfully on Windows.
- The `socket.io-client` version should match the server `socket.io` major version.
