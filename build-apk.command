#!/bin/bash
# Double-click to build Loan as an Android app (Loan.apk, next to this file).
# Copy Loan.apk to any Android phone and open it to install.
# Installs Java and the Android SDK the first time if they are missing.
# The first build takes 10–20 minutes (it downloads Gradle and libraries); later ones are faster.
set -e
set -o pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/app" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

step() { printf '\n\033[1;32m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m%s\033[0m\n' "$*"; read -r -p "Press Enter to close"; exit 1; }
trap 'fail "The build stopped. The messages above say why."' ERR

FREE_GB=$(df -g "$HOME" | awk 'NR==2{print $4}')
[ "${FREE_GB:-0}" -ge 8 ] || fail "Only ${FREE_GB} GB free on your Mac. The build needs about 8 GB free. Empty the Bin, clear Downloads, or check System Settings > General > Storage, then try again."
# Clean up a half-installed NDK from an earlier run that ran out of space.
for d in "$ANDROID_HOME"/ndk/*/; do [ -d "$d" ] && [ ! -f "$d/source.properties" ] && rm -rf "$d"; done
rm -rf "$ANDROID_HOME/.temp" "$ANDROID_HOME/.downloadIntermediates" 2>/dev/null || true

ARCH="$(uname -m)"; [ "$ARCH" = "arm64" ] && JARCH=aarch64 || JARCH=x64
TOOLS="$HOME/.loan-build"; mkdir -p "$TOOLS"

# Java 17: Android Studio's if present, else an existing one, else download it once.
if [ -z "$JAVA_HOME" ]; then
  for j in "/Applications/Android Studio.app/Contents/jbr/Contents/Home" "$TOOLS/jdk/Contents/Home"; do
    [ -x "$j/bin/java" ] && JAVA_HOME="$j" && break
  done
  [ -n "$JAVA_HOME" ] || JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
fi
if [ -z "$JAVA_HOME" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  step "Downloading Java 17 (one time, ~190 MB)…"
  rm -rf "$TOOLS/jdk" "$TOOLS/jdk.tgz"; mkdir -p "$TOOLS/jdk"
  curl -fL --progress-bar -o "$TOOLS/jdk.tgz" "https://api.adoptium.net/v3/binary/latest/17/ga/mac/$JARCH/jdk/hotspot/normal/eclipse"
  tar -xzf "$TOOLS/jdk.tgz" -C "$TOOLS/jdk" --strip-components=1 && rm "$TOOLS/jdk.tgz"
  JAVA_HOME="$TOOLS/jdk/Contents/Home"
fi
export JAVA_HOME PATH="$JAVA_HOME/bin:$PATH"
"$JAVA_HOME/bin/java" -version 2>&1 | head -1

# Android SDK: download the command-line tools once if there's no SDK yet.
SDKM="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
if [ ! -x "$SDKM" ]; then
  step "Downloading the Android SDK tools (one time, ~150 MB)…"
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  curl -fL --progress-bar -o "$TOOLS/cmdtools.zip" "https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip"
  rm -rf "$ANDROID_HOME/cmdline-tools/latest" "$TOOLS/cmdline-tools"
  unzip -q "$TOOLS/cmdtools.zip" -d "$TOOLS" && mv "$TOOLS/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest" && rm "$TOOLS/cmdtools.zip"
fi
if [ ! -d "$ANDROID_HOME/platform-tools" ]; then
  step "Installing Android SDK packages (one time)…"
  yes | "$SDKM" --licenses >/dev/null || true
  "$SDKM" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
fi
yes | "$SDKM" --licenses >/dev/null 2>&1 || true

# The NDK (needed to compile the app's native code). Remove a broken copy, then install it.
NDK_VER=27.1.12297006
if [ ! -f "$ANDROID_HOME/ndk/$NDK_VER/source.properties" ]; then
  rm -rf "$ANDROID_HOME/ndk/$NDK_VER"
  step "Installing the Android NDK (one time, ~1 GB download, ~3 GB on disk)…"
  "$SDKM" "ndk;$NDK_VER"
  [ -f "$ANDROID_HOME/ndk/$NDK_VER/source.properties" ] || fail "The NDK didn't install. The messages above say why (often: not enough free space)."
fi
echo "Free space: $(df -g "$HOME" | awk 'NR==2{print $4}') GB"

command -v node >/dev/null || fail "Node.js not found. Install it from nodejs.org, then try again."

echo "Server the app will use: $(grep EXPO_PUBLIC_API_URL .env 2>/dev/null | cut -d= -f2- || echo 'not set')"

step "1/4  Installing packages…"
[ -d node_modules ] || npm install
[ -d node_modules/expo-build-properties ] || npx expo install expo-build-properties

step "2/4  Generating the Android project…"
EXPO_NO_GIT_STATUS=1 CI=1 npx expo prebuild --platform android --clean --no-install
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
# More memory for Gradle and fewer jobs at once, so it doesn't crash on a laptop.
echo >> android/gradle.properties  # the file doesn't end with a newline
cat >> android/gradle.properties <<'PROPS'
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError
org.gradle.parallel=false
org.gradle.workers.max=2
PROPS

step "3/4  Building the APK (this is the slow part)…"
cd android
./gradlew --stop >/dev/null 2>&1 || true
./gradlew assembleRelease --no-daemon --stacktrace --info -PreactNativeArchitectures=arm64-v8a,armeabi-v7a 2>&1 | tee "$ROOT/build.log" | grep -vE "^\s+at |^(Resource missing|Skipping|Caching disabled|Task .* is not up-to-date|Up-to-date check|Custom actions)"
APK="app/build/outputs/apk/release/app-release.apk"
[ -f "$APK" ] || fail "The build finished but no APK was found."
cp "$APK" "$ROOT/Loan.apk"

step "4/4  Done: $ROOT/Loan.apk ($(du -h "$ROOT/Loan.apk" | cut -f1))"
if command -v adb >/dev/null && adb devices | grep -qE "\s+device$"; then
  echo "Installing on the connected phone/emulator…"
  adb install -r "$ROOT/Loan.apk" || echo "Couldn't install it automatically. Copy Loan.apk to the phone and open it instead."
fi
open -R "$ROOT/Loan.apk"
read -r -p "Press Enter to close"
