import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from './src/contexts/AuthContext';
import { NotesProvider, useNotes } from './src/contexts/NotesContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { scheduleAllNotifications } from './src/screens/ScheduleScreen';
import { ScheduleSettings } from './src/types';

const SCHEDULE_STORAGE_KEY = 'schedule_settings';

function NotificationScheduler() {
  const { notes, isLoading } = useNotes();

  useEffect(() => {
    if (isLoading || notes.length === 0) return;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);
        if (!stored) return;
        const settings: ScheduleSettings = JSON.parse(stored);
        if (!settings.isEnabled) return;
        await scheduleAllNotifications(settings, notes);
      } catch (error) {
        console.error('Failed to reschedule notifications:', error);
      }
    })();
  }, [isLoading, notes]);

  return null;
}

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
          <NotificationScheduler />
          <StatusBar style="dark" />
          <AppNavigator />
        </NotesProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
