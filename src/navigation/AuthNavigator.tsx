// src/navigation/AuthNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';

import React from 'react';

import { AuthStackParamList } from '../types/navigation';
import LoginScreen from '../features/auth/screens/LoginScreen';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
