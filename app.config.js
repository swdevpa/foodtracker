import 'dotenv/config';

export default {
  expo: {
    name: "FoodTracker",
    slug: "foodtracker",
    version: "1.0.0",
    orientation: "portrait",
    // icon: "./assets/icon.png", // TODO: Add icon
    userInterfaceStyle: "automatic",
    // splash: {
    //   image: "./assets/splash.png",
    //   resizeMode: "contain", 
    //   backgroundColor: "#ffffff"
    // }, // TODO: Add splash
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.swdevpa.foodtracker",
      buildNumber: "1",
      infoPlist: {
        NSHealthShareUsageDescription: "This app uses HealthKit to import your health data like weight, height, and activity to provide personalized meal recommendations.",
        NSHealthUpdateUsageDescription: "This app uses HealthKit to save nutritional information from your meals to your Health app.",
        NSHealthClinicalHealthRecordsShareUsageDescription: "This app does not access clinical health records.",
        ITSAppUsesNonExemptEncryption: false
      },
      entitlements: {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.healthkit.access": []
      }
    },
    android: {
      // adaptiveIcon: {
      //   foregroundImage: "./assets/adaptive-icon.png",
      //   backgroundColor: "#ffffff"
      // }, // TODO: Add adaptive icon
      package: "com.swdevpa.foodtracker"
    },
    web: {
      // favicon: "./assets/favicon.png", // TODO: Add favicon
      bundler: "metro"
    },
    plugins: [
      "./plugins/react-native-health-plugin.js"
    ],
    extra: {
      eas: {
        projectId: "ef6ff013-e0f1-43ea-9045-3fbcf717224f"
      },
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      USDA_API_KEY: process.env.USDA_API_KEY || process.env.NUTRITION_API_KEY,
      USDA_API_BASE_URL: process.env.USDA_API_BASE_URL || "https://api.nal.usda.gov/fdc/v1"
    }
  }
};