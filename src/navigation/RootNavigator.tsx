// src/navigation/RootNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect } from 'react';

import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';
import { useUserProfile } from '../hooks';
import OnboardingFlowScreen from '../features/onboarding/screens/EnhancedOnboardingFlowScreen';
import SplashScreen from '../features/auth/screens/SplashScreen';
import useAuthStore from '../store/authStore';
import { RootStackParamList } from '../types/navigation';

const Root = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const { profile, isLoadingProfile, isProfileError } = useUserProfile();
  const onboarded = profile?.onboarded;

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Remove verbose auth-state debug logs

  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      {authIsLoading ? (
        // Still determining auth state → show splash
        <Root.Screen name="Splash" component={SplashScreen} />
      ) : !isAuthenticated ? (
        // Not authenticated → go to auth flow
        <Root.Screen name="Auth" component={AuthNavigator} />
      ) : isLoadingProfile ? (
        // Authenticated but profile not loaded yet → keep splash to avoid onboarding flash
        <Root.Screen name="Splash" component={SplashScreen} />
      ) : !onboarded || isProfileError ? (
        // Profile loaded and user not onboarded (or profile errored) → onboarding
        <Root.Screen name="Onboarding" component={OnboardingFlowScreen} />
      ) : (
        // Fully ready → main app
        <Root.Screen name="MainApp" component={AppNavigator} />
      )}
    </Root.Navigator>
  );
};

export default RootNavigator;
