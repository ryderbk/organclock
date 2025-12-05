import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra as any) || (Constants.manifest?.extra as any) || {};
const firebaseConfig = extra.firebase || {};

if (!firebaseConfig?.apiKey) {
    console.warn('Firebase config missing. Set EXPO_PUBLIC_* env vars in mobile-expo/.env');
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
export const db = getFirestore(app);
