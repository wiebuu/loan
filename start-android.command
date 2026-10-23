#!/bin/bash
# Double-click to open Loan in the Android emulator (Android Studio's).
# Starts your first emulator if none is running, then opens the app in Expo Go there.
cd "$(dirname "$0")/app" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

fail() { printf '\n\033[1;31m%s\033[0m\n' "$*"; read -r -p "Press Enter to close"; exit 1; }

command -v adb >/dev/null || fail "Android SDK not found at $ANDROID_HOME. Open Android Studio once and finish its setup (it installs the SDK)."

if ! adb devices | grep -qE "emulator-[0-9]+\s+device"; then
  AVD=$(emulator -list-avds 2>/dev/null | head -1)
  [ -n "$AVD" ] || fail "No emulator yet. In Android Studio: More Actions → Virtual Device Manager → Create device (any Pixel), then double-click this again."
  echo "Starting the emulator ($AVD)…"
  nohup emulator -avd "$AVD" >/dev/null 2>&1 &
  adb wait-for-device
  printf "Waiting for Android to boot"
  until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do printf "."; sleep 2; done
  echo " ready."
fi

# Only one Expo can run at a time, so stop the one from start-app.command if it's open.
PIDS=$(lsof -ti tcp:8081 2>/dev/null); [ -n "$PIDS" ] && kill $PIDS 2>/dev/null && sleep 1

[ -d node_modules ] || npm install
echo "Opening Loan in the emulator (it installs Expo Go there the first time)…"
npx expo start --android --clear
