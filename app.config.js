export default {
  expo: {
    name: "SermonMate",
    slug: "sermonmate",
    version: "1.0.0",
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
      versionCode: 1,
      permissions: [
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.INTERNET",
        "android.permission.WAKE_LOCK"
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
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "9d737b63-33ca-4168-bfae-f89e8d3415df"
      },
      // Make API URL available via expo-constants
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://sermonmate.bobakdevs.com/api/v1",
      // Make Gemini API key available
      geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
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

