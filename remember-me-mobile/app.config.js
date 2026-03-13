const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
// Derive iosUrlScheme by reversing the domain segments of the iOS client ID
// e.g. "12345.apps.googleusercontent.com" → "com.googleusercontent.apps.12345"
const iosUrlScheme = iosClientId?.split('.').reverse().join('.');

module.exports = {
  expo: {
    name: 'remember-me-mobile',
    slug: 'remember-me-mobile',
    scheme: 'rememberme',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.rememberme.app',
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [iosUrlScheme]
          }
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.rememberme.app',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-secure-store',
      'expo-notifications',
      ['@react-native-google-signin/google-signin', { iosUrlScheme }],
    ],
  },
};
