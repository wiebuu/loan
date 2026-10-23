#!/bin/bash
# Double-click to start the Expo app. Scan the QR code with Expo Go, or press w for the browser.
cd "$(dirname "$0")/app" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -d node_modules ] || npm install
npx expo start --clear
