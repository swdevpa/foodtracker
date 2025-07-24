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
        NSCameraUsageDescription: "This app uses the camera to scan barcodes for adding food items to your inventory.",
        ITSAppUsesNonExemptEncryption: false
      },
      entitlements: {
        "com.apple.developer.healthkit": true
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
      [
        "react-native-health",
        {
          isClinicalDataEnabled: false,
          healthSharePermission: "This app uses HealthKit to import your health data like weight, height, and activity to provide personalized meal recommendations.",
          healthUpdatePermission: "This app uses HealthKit to save nutritional information from your meals to your Health app."
        }
      ],
      [
        "expo-barcode-scanner",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access camera to scan barcodes for food items."
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "ef6ff013-e0f1-43ea-9045-3fbcf717224f"
      },
      API_PROXY_URL: process.env.API_PROXY_URL
    }
  }
};