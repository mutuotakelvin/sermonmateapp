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

```bash
mkdir -p ~/Android/Sdk/cmdline-tools
cd ~/Android/Sdk/cmdline-tools
unzip ~/Downloads/commandlinetools-linux-*_latest.zip
mv cmdline-tools latest
```

The rename to `latest` is required — `sdkmanager` looks for
`$ANDROID_HOME/cmdline-tools/latest/bin`. Skipping it is the most common setup failure.

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
sdkmanager --licenses          # accept every prompt; Gradle will not build otherwise
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" \
           "ndk;<version from step 4>" "cmake;3.22.1"
```

If a later build complains about a missing platform or build-tools version, install
exactly what the error names — with licences accepted, Gradle also auto-downloads most
missing SDK pieces on its own. The NDK is the one it usually won't fetch for you.

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
