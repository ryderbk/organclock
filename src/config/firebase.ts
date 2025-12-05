import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence, browserLocalPersistence, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra as any) || (Constants.manifest?.extra as any) || {};
const firebaseConfig = extra.firebase || {};

const isConfigValid = firebaseConfig?.apiKey && firebaseConfig?.projectId;

if (!isConfigValid) {
    console.warn('Firebase config missing. Set EXPO_PUBLIC_* env vars in .env');
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigValid) {
    try {
        app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        
        if (Platform.OS === 'web') {
            auth = getAuth(app);
            auth.setPersistence(browserLocalPersistence);
        } else {
            auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
        }
        
        db = getFirestore(app);
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

export { auth, db };
