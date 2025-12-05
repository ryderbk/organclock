import 'dotenv/config';
import type { ExpoConfig } from '@expo/config';

export default (): ExpoConfig => ({
  name: 'Activity Logger',
  slug: 'activity-logger',
  scheme: 'activitylogger',
  version: '1.0.0',
  orientation: 'portrait',
  assetBundlePatterns: ['**/*'],
    splash: {
    "backgroundColor": "#0b0d12"
  },
  android: {
    package: 'com.activitylogger.app',
    adaptiveIcon: { backgroundColor: '#0b0d12' }
  },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
    }
  }
});
