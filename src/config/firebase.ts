import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra as any) || (Constants.manifest?.extra as any) || {};
const firebaseConfig = extra.firebase || {};

if (!firebaseConfig?.apiKey) {
    console.warn('Firebase config missing. Set EXPO_PUBLIC_* env vars in .env');
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
    auth.setPersistence(browserLocalPersistence);
} else {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

export { auth };
export const db = getFirestore(app);
