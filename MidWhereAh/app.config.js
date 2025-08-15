export default {
    expo: {
      name: "MidWhereAh",
      slug: "midwhereah",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "light",
      splash: {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: "#8B5DB8"
      },
      plugins: [
        [
          "@react-native-mapbox-gl/maps",
          {
            RNMapboxMapsDownloadToken: process.env.EXPO_PUBLIC_MAPBOX_DOWNLOAD_TOKEN
          }
        ]
      ],
      assetBundlePatterns: [
        "**/*"
      ],
      ios: {
        supportsTablet: false,
        bundleIdentifier: "com.midwhereah.app"
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#8B5DB8"
        },
        package: "com.midwhereah.app",
        permissions: [
          "ACCESS_FINE_LOCATION",
          "ACCESS_COARSE_LOCATION"
        ]
      },
      web: {
        favicon: "./assets/favicon.png"
      }
    }
  };