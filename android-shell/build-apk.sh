#!/usr/bin/env bash
# ساخت APK آزمایشی «سفره» بدون Gradle — مستقیم با ابزارهای Android SDK
# پیش‌نیاز: JDK و Android SDK (platform android-36 + build-tools 36)
set -euo pipefail

SDK="${ANDROID_HOME:-$HOME/Android/sdk}"
BT="$SDK/build-tools/36.0.0"
AJAR="$SDK/platforms/android-36/android.jar"
JAVA_HOME="${JAVA_HOME:-$HOME/Android/jdk}"
export PATH="$JAVA_HOME/bin:$PATH"
JAVAC="$JAVA_HOME/bin/javac"
KEYTOOL="$JAVA_HOME/bin/keytool"
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/build"
rm -rf "$OUT" && mkdir -p "$OUT/gen" "$OUT/classes" "$OUT/dex"

echo "==> aapt2 compile + link"
"$BT/aapt2" compile --dir "$ROOT/res" -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/app-unsigned.apk" \
  -I "$AJAR" \
  --manifest "$ROOT/AndroidManifest.xml" \
  -A "$ROOT/assets" \
  --java "$OUT/gen" \
  --min-sdk-version 24 --target-sdk-version 35 \
  "$OUT/res.zip"

echo "==> javac"
find "$ROOT/src" "$OUT/gen" -name '*.java' > "$OUT/sources.txt"
"$JAVAC" -encoding UTF-8 -source 17 -target 17 \
  -classpath "$AJAR" -d "$OUT/classes" @"$OUT/sources.txt"

echo "==> d8"
"$BT/d8" --lib "$AJAR" --min-api 24 --output "$OUT/dex" \
  $(find "$OUT/classes" -name '*.class')

echo "==> package + align"
(cd "$OUT" && zip -q app-unsigned.apk dex/classes.dex)
"$BT/zipalign" -f -p 4 "$OUT/app-unsigned.apk" "$OUT/app-aligned.apk"

echo "==> sign (debug key)"
if [ ! -f "$ROOT/debug.keystore" ]; then
  "$KEYTOOL" -genkeypair -v -keystore "$ROOT/debug.keystore" -storepass android \
    -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10950 \
    -dname "CN=Sofreh Debug,O=PARASIS,C=IR" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$ROOT/debug.keystore" --ks-pass pass:android \
  --key-pass pass:android --out "$OUT/sofre-test.apk" "$OUT/app-aligned.apk"

"$BT/apksigner" verify --print-certs "$OUT/sofre-test.apk" | head -n 2
ls -la "$OUT/sofre-test.apk"
echo "DONE: $OUT/sofre-test.apk"
