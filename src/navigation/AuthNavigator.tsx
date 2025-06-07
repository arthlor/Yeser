// src/navigation/AuthNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';

import React from 'react';

import { AuthStackParamList } from '../types/navigation';
import LoginScreen from '../features/auth/screens/LoginScreen';
import SignUpScreen from '../features/auth/screens/SignUpScreen';
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen';
import SetNewPasswordScreen from '../features/auth/screens/SetNewPasswordScreen';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    <Stack.Screen name="SetNewPassword" component={SetNewPasswordScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
