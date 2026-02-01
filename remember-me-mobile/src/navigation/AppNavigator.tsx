import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';

import { NotesScreen } from '../screens/NotesScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';

export type RootStackParamList = {
  Notes: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: [Linking.createURL('/'), 'rememberme://'],
  config: {
    screens: {
      Notes: '',
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
    },
  },
};

interface AppNavigatorProps {
  onDeepLink?: (url: string) => void;
}

export function AppNavigator({ onDeepLink }: AppNavigatorProps) {
  return (
    <NavigationContainer
      linking={linking}
      onStateChange={() => {
        // State changed
      }}
    >
      <Stack.Navigator
        initialRouteName="Notes"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#fff' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Notes" component={NotesScreen} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
