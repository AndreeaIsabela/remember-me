import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from './src/contexts/AuthContext';
import { NotesProvider } from './src/contexts/NotesContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Handle deep link when app is opened from closed state
    const handleInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        handleDeepLink(url);
      }
    };

    handleInitialURL();

    // Handle deep link when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    const { queryParams } = Linking.parse(url);

    // Handle email confirmation redirect from API
    if (queryParams?.confirmed === 'true') {
      Alert.alert(
        'Email Confirmed',
        'Your email has been verified successfully! You can now log in.',
        [{ text: 'OK' }]
      );
    } else if (queryParams?.error === 'confirmation_failed') {
      Alert.alert(
        'Confirmation Failed',
        'Email confirmation failed. The link may have expired. Please request a new verification email.',
        [{ text: 'OK' }]
      );
    }

    // ResetPassword deep link is handled by navigation automatically
    // since it matches the 'reset-password' route with token param
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NotesProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </NotesProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
