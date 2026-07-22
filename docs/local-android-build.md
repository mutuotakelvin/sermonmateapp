# Building SermonMate locally (Arch Linux)

Set this up once and you never hit the EAS free-tier build quota again — local builds
don't count against it.

Verified state of this machine at the time of writing: Arch, zsh, `yay` and `adb`
present, JDK 26 installed, **no** Android SDK (`ANDROID_HOME` unset), 103 GB free on
`/home`. Gradle itself does not need installing — `android/gradlew` fetches 8.14.3.

---

## ⚠️ Read this first: signing

Your Play upload key lives on EAS (`Build Credentials QAnfZIWCE6`). Play rejects any
upload signed with a different key, and **you cannot change the key after the fact**.

So: build with `eas build --local`, not with `./gradlew` directly. It runs the same
build steps on your machine but still pulls your real credentials from EAS, so the
artifact is signed identically to the cloud builds you've already shipped. Raw
`gradlew assembleRelease` would sign with a debug key and be rejected.

---

## 1. JDK 17

React Native 0.81 / AGP need 17; you have 26. Keep both — just point `JAVA_HOME` at 17
rather than changing the system default with `archlinux-java`.

```bash
sudo pacman -S --needed jdk17-openjdk
```

Installs to `/usr/lib/jvm/java-17-openjdk`.

## 2. Android command-line tools

Grab the **"Command line tools only"** Linux zip from
<https://developer.android.com/studio#command-line-tools-only>. (Take the URL from that
page rather than guessing a build number — Google bumps it often.)

The zip contains a single top-level `cmdline-tools/` directory. That directory has to end
up at `$ANDROID_HOME/cmdline-tools/latest`:

```bash
mkdir -p ~/Android/Sdk/cmdline-tools
unzip ~/Downloads/commandlinetools-linux-*_latest.zip -d /tmp/actools
mv /tmp/actools/cmdline-tools ~/Android/Sdk/cmdline-tools/latest
```

The rename to `latest` is required — `sdkmanager` looks for
`$ANDROID_HOME/cmdline-tools/latest/bin`. Skipping it is the most common setup failure.

(Done on this machine with build 15859902.)

## 3. Environment

Append to `~/.zshrc`:

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH
```

```bash
source ~/.zshrc
java -version        # must say 17, not 26
sdkmanager --version # must print a version
```

## 4. Regenerate the native project

`android/` is gitignored and currently **stale** — it predates the `SCHEDULE_EXACT_ALARM`
permission and the new splash colors, so it must be rebuilt from `app.config.js`:

```bash
cd ~/hobby/sermonmateapp
npx expo prebuild --platform android --clean
```

Then read the exact NDK version this Expo/RN combination pins, instead of guessing:

```bash
grep -rn "ndkVersion" android/ | head
```

## 5. Install the SDK packages

```bash
yes | sdkmanager --licenses    # Gradle will not build until these are accepted
sdkmanager "platform-tools" "platforms;android-36" "platforms;android-35" \
           "build-tools;36.0.0" "build-tools;35.0.0" \
           "ndk;27.1.12297006" "cmake;3.22.1"
```

These are the versions actually installed for Expo SDK 54 / RN 0.81.5 on 2026-07-22 —
the NDK number comes from `node_modules/react-native/gradle/libs.versions.toml`, which is
the authoritative pin. Both 35 and 36 are installed as cheap insurance; the whole SDK
comes to about 2.8 GB.

`sdkmanager` now prints a deprecation notice pointing at a new `android sdk` CLI. It still
works — ignore it.

## 6. Test build (APK you can sideload)

```bash
npx eas-cli build --platform android --profile preview --local
```

First run is slow — 15–30 min while Gradle downloads dependencies and compiles native
code. Later builds are far quicker. Output is an `.apk` in the project directory.

```bash
adb install -r build-*.apk     # adb comes from the android-tools package you already have
```

## 7. Smoke test (v1.3.0 — the four things static checks can't see)

1. **On a 3-button-nav device**: tap Mood, tap Profile. This is the whole point of the release.
2. **Profile → Appearance → Dark**, then walk every screen — home, mood calendar, reflection
   reader, card editor, wallpaper editor, login. Look for invisible text.
3. **Generate a reflection → "Pray about this" → Save → back out → reopen.** The prayer must persist.
4. **Set a reminder ~5 min out.** If the verse screen warns about exact alarms, grant it and
   confirm the warning clears.

## 8. Production build + upload

```bash
npx eas-cli build --platform android --profile production --local
```

Produces an `.aab` (versionCode 17). Upload it to Play Console → Testing → **Internal
testing**, which publishes in minutes with no review, then promote when you're happy.
Or submit from the CLI:

```bash
npx eas-cli submit --platform android --path <file>.aab
```

---

## Gotchas

- **Never hand-edit anything under `android/`** — `prebuild --clean` wipes it. All native
  config belongs in `app.config.js`.
- **Gradle OOM**: raise `org.gradle.jvmargs` in `android/gradle.properties` (currently `-Xmx2048m`).
- **`JAVA_HOME` drift**: if a build suddenly fails on an unsupported class file version,
  something put JDK 26 back on the path ahead of 17.
- **Disk**: the SDK + NDK + Gradle caches run to roughly 10–15 GB.

## Worth doing while you're here

`expo-updates` is not installed, so every fix — even pure-JS ones — needs a full build and
a store round-trip. Adding it would let you push JS-only changes to testers over the air in
seconds. It needs one native build to take effect, so the production build in step 8 is the
natural moment to include it.
