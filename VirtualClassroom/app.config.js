import 'dotenv/config';

export default {
  expo: {
    "name": "practice",
    "slug": "practice",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "practice",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.practice", // Replace with your bundle identifier
      "infoPlist": {
        "NSCameraUsageDescription": "This app needs access to your camera to make video calls.",
        "NSMicrophoneUsageDescription": "This app needs access to your microphone to make video calls."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.practice", // Replace with your package name
        "permissions": [
          "android.permission.CAMERA",
          "android.permission.RECORD_AUDIO"
        ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    extra: {
        BACKEND_API: process.env.BACKEND_API,
        ML_API:process.env.ML_API,
        AGORA_APP_ID: process.env.AGORA_APP_ID,
        eas: {
          projectId: "your-eas-project-id" // Replace with your EAS project ID if using EAS
        }
    },
    "plugins": [
      "expo-router"
    ],
    "experiments": {
      "typedRoutes": true
    }
  },
};
