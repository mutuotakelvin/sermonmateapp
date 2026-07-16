export default {
  expo: {
    name: "SermonMate",
    slug: "sermonmate",
    version: "1.2.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "sermonmate",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bitcode: false,
      bundleIdentifier: "com.sermonmate.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#FFFFFF",
        foregroundImage: "./assets/images/icon.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.sermonmate.app",
      versionCode: 16,
      permissions: [
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.INTERNET",
        "android.permission.WAKE_LOCK",
        "android.permission.POST_NOTIFICATIONS",
        // Without this, canScheduleExactAlarms() is false on Android 12+ and
        // expo-notifications silently downgrades to setAndAllowWhileIdle, which
        // Doze batches into a maintenance window — a 7:27 AM reminder arrived at
        // 10:00 AM. Deliberately NOT USE_EXACT_ALARM: that one is auto-granted
        // but Play restricts it to apps whose core function is an alarm clock or
        // calendar, which we are not. This one is user-granted instead — denied
        // by default at our target SDK, so the verse screen prompts for it.
        "android.permission.SCHEDULE_EXACT_ALARM"
      ],
      // We only SAVE verse cards to the gallery (write-only), never read the
      // user's media, so strip the broad read-media permissions that
      // expo-media-library declares by default. This clears Google Play's
      // "undeclared photo and video permissions" review flag.
      blockedPermissions: [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_VISUAL_USER_SELECTED"
      ]
    },
    web: {
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      [
        "expo-notifications",
        {
          color: "#0891B2"
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Allow SermonMate to save verse cards to your photos.",
          savePhotosPermission: "Allow SermonMate to save verse cards to your photos.",
          isAccessMediaLocationEnabled: false
        }
      ],
      "@react-native-google-signin/google-signin",
      // Supplies canScheduleExactAlarms() + openSettings('alarms'); expo-notifications
      // exposes no JS API for exact-alarm state.
      "react-native-permissions"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      // RevenueCat PUBLIC SDK key (safe to embed). This is the production
      // Google `goog_…` API key from RevenueCat → Project → API keys.
      revenueCatAndroidKey: "goog_QDJRtNjQizFwKfCUUdOIBXYBylZ",
      // Firebase Google provider's WEB OAuth client ID (public, safe to embed).
      // Paste the "Web client (auto created by Google Service)" ID from
      // Firebase → Authentication → Google → Web SDK configuration.
      googleWebClientId: "879460367628-1nul0ego66l1o87m82k7d43hn5dpm4f4.apps.googleusercontent.com",
      eas: {
        projectId: "9d737b63-33ca-4168-bfae-f89e8d3415df"
      },
      // Firebase web app config (public identifiers, safe to commit)
      firebase: {
        apiKey: "AIzaSyBZKjgaSi_qd8inMx5R5VvYIJpGlWz32lA",
        authDomain: "sermonmate-919e5.firebaseapp.com",
        projectId: "sermonmate-919e5",
        storageBucket: "sermonmate-919e5.firebasestorage.app",
        messagingSenderId: "879460367628",
        appId: "1:879460367628:web:fc17c7e93c90fafc309d29"
      },
    }
  }
};

