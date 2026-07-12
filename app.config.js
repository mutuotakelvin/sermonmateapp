export default {
  expo: {
    name: "SermonMate",
    slug: "sermonmate",
    version: "1.1.0",
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
      versionCode: 11,
      permissions: [
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.INTERNET",
        "android.permission.WAKE_LOCK",
        "android.permission.POST_NOTIFICATIONS"
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
      "@react-native-google-signin/google-signin"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      // RevenueCat PUBLIC SDK key (safe to embed). Dev = test key; swap the
      // production `goog_…` Android key for release builds.
      revenueCatAndroidKey: "test_mjRkcgiEYcLDcfMeljRIjuuhTvd",
      // Firebase Google provider's WEB OAuth client ID (public, safe to embed).
      // Paste the "Web client (auto created by Google Service)" ID from
      // Firebase → Authentication → Google → Web SDK configuration.
      googleWebClientId: "",
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

