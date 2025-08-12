import type { ExpoConfig } from "expo-router/entry"

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
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-secure-store"],
    extra: {
      // Values read at runtime by lib/api.ts and lib/supabase.ts
      expoPublicApiBaseUrl: apiBaseUrl,
      expoPublicSupabaseUrl: supabaseUrl,
      expoPublicSupabaseAnonKey: supabaseAnon,
    },
  }
}


