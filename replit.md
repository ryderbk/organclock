# Activity Logger (Expo)

## Overview
A React Native Expo application with Firebase integration for activity logging. Features include:
- Bottom tabs navigation: Home (analog clock), Log Activity, Log History, Profile
- Email/password authentication via Firebase
- Firebase Firestore database for data persistence
- Admin and user roles with different capabilities

## Project Architecture

### Tech Stack
- **Framework**: Expo SDK 51
- **Language**: TypeScript
- **Navigation**: React Navigation (native-stack, bottom-tabs)
- **Backend**: Firebase (Auth + Firestore)
- **Styling**: React Native StyleSheet (dark theme)

### Directory Structure
```
/
├── App.tsx              # Main app component with navigation
├── src/
│   ├── assets/          # Images and static data
│   ├── components/      # Reusable UI components
│   ├── config/          # Firebase configuration
│   ├── navigation/      # Navigation setup
│   ├── screens/         # App screens
│   │   ├── auth/        # Login/Register screens
│   │   ├── Admin*.tsx   # Admin screens
│   │   └── *.tsx        # User screens
│   ├── services/        # Business logic services
│   └── types/           # TypeScript type definitions
├── app.config.ts        # Expo configuration
├── metro.config.js      # Metro bundler configuration
└── package.json         # Dependencies
```

## Development

### Running the App
The app runs via Expo on port 5000:
```bash
npm run web
```

### Required Environment Variables
The app requires Firebase credentials to be set as secrets:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_DATABASE_URL`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EAS_PROJECT_ID` (optional, for EAS builds)

## Recent Changes
- December 5, 2025: Initial import and Replit environment setup
  - Configured Expo web server workflow on port 5000
  - Fixed dependency issues (expo-modules-core, graphql, metro)
  - Set up proper CORS and host configuration

## User Preferences
- Dark theme with colors: background #0b0d12, card #121622, text #e5e7eb, primary #6366f1
