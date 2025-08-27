import type { ExpoConfig } from "expo/config"

const name = "mobile"

export default (): ExpoConfig => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000"

  return {
    name,
    slug: name,
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/youlogo.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/youlogo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.APP_BUNDLE_ID || "com.you.first",
      buildNumber: process.env.IOS_BUILD_NUMBER || "1",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          "We use your photo library so you can choose a profile picture.",
        NSCameraUsageDescription:
          "We use the camera to let you take a profile picture.",
      },
    },
    android: {
      package: process.env.ANDROID_PACKAGE || "com.youfirst.tracker",
      versionCode: parseInt(process.env.ANDROID_VERSION_CODE || "2"),
      adaptiveIcon: {
        foregroundImage: "./assets/youlogo.png",
        backgroundColor: "#000000",
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-secure-store", "expo-image-picker"],
    extra: {
      // Values read at runtime by lib/api.ts and lib/supabase.ts
      expoPublicApiBaseUrl: apiBaseUrl,
      expoPublicSupabaseUrl: supabaseUrl,
      expoPublicSupabaseAnonKey: supabaseAnon,
      eas: {
        projectId: "d44ec5f1-06a0-4e9b-b711-6b251d4037da",
      },
    },
  }
}


