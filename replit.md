# Activity Logger (Expo)

## Project Overview
This is an Expo-based React Native application that runs on web, Android, and iOS platforms. The app features user authentication via Firebase and includes activity logging functionality with an analog clock interface.

## Current State
- **Status**: Successfully set up and running on Replit
- **Platform**: Expo Web (React Native for Web)
- **Port**: 5000
- **Last Updated**: December 5, 2024

## Project Architecture

### Tech Stack
- **Framework**: Expo SDK 51
- **UI Library**: React Native / React Native Web
- **Navigation**: React Navigation (Bottom Tabs, Native Stack)
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Language**: TypeScript

### Key Features
- Email/password authentication
- Bottom tab navigation (Home, Log Activity, Log History, Profile)
- Admin features for managing sub-users
- Special treatment requests and live treatment tracking
- Activity logging with history
- Analog clock display on home screen

### Directory Structure
```
src/
├── assets/         # Images and static files
├── components/     # Reusable UI components
├── config/         # Firebase and other configurations
├── navigation/     # Navigation setup
├── screens/        # Screen components
│   ├── auth/      # Login and Register screens
│   └── ...        # Other screens
├── services/       # Business logic services
└── types/          # TypeScript type definitions
```

## Setup Instructions

### Environment Variables
The application requires Firebase credentials to be set up in the environment variables or `.env` file:

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EAS_PROJECT_ID=
```

**Note**: The `.env` file has been created from `.env.example` but needs to be populated with actual Firebase credentials.

### Running the Application

#### Development Mode
The application is already configured to run automatically via the workflow:
- **Command**: `npm run web`
- **URL**: The app runs on port 5000 and is accessible through the Replit webview

#### Building for Production
To build the application for production deployment:
```bash
npm run build:web
```
This generates static files in the `web-build/` directory.

### Deployment
The project is configured for static deployment:
- **Build Command**: `npm run build:web`
- **Public Directory**: `web-build`
- **Deployment Type**: Static (client-side only)

## Configuration Changes Made for Replit

### Web Platform Support
1. **Metro Config**: Created `metro.config.js` with Expo defaults
2. **App Config**: Added web bundler configuration in `app.config.ts`
3. **Package Scripts**: Updated web script to run on port 5000 with proper host settings

### Firebase Web Compatibility
Modified `src/config/firebase.ts` to handle both web and native platforms:
- Web platform uses `browserLocalPersistence`
- Native platforms use `getReactNativePersistence` with AsyncStorage

### Port Configuration
- Development server runs on port 5000 (required for Replit webview)
- Environment variable `EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0` set for proper network binding

## Dependencies

### Main Dependencies
- `expo`: ^51.0.0
- `react`: 18.2.0
- `react-native`: 0.74.5
- `react-native-web`: ~0.19.10
- `firebase`: ^10.14.0
- `@react-navigation/native`: ^6.1.17
- `@react-navigation/bottom-tabs`: ^6.5.20

### Dev Dependencies
- `typescript`: ~5.3.3
- `@types/react`: ~18.2.79
- `@types/node`: ^24.10.1

## Known Issues

### @expo/config Version Warning
The installed version of `@expo/config` (12.0.11) is newer than the expected version (9.0.0) for Expo SDK 51. This is a minor compatibility warning and doesn't affect functionality.

### Firebase Configuration Required
The application will show a warning about missing Firebase configuration until environment variables are set. To fully use the app:
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password) and Firestore
3. Add the Firebase credentials to your environment variables or `.env` file

## Recent Changes
- December 5, 2024: Initial Replit setup completed
  - Installed missing dependencies (@types/node, dotenv, @expo/config)
  - Configured Expo for web platform
  - Fixed Firebase auth compatibility for web
  - Set up workflow on port 5000
  - Configured static deployment

## User Preferences
None recorded yet.
