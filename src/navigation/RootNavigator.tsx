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
import { logger } from '@/utils/debugConfig';

const Root = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const { profile, isLoadingProfile, isProfileError, profileError } = useUserProfile();
  const onboarded = profile?.onboarded;

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!authIsLoading) {
      logger.debug('Auth state determined:', {
        isAuthenticated,
        onboarded,
        profile,
        isLoadingProfile,
        isProfileError,
        profileError,
      });
    }
  }, [
    isAuthenticated,
    authIsLoading,
    onboarded,
    profile,
    isLoadingProfile,
    isProfileError,
    profileError,
  ]);

  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      {authIsLoading ? (
        <Root.Screen name="Splash" component={SplashScreen} />
      ) : !isAuthenticated ? (
        <Root.Screen name="Auth" component={AuthNavigator} />
      ) : !onboarded || isProfileError ? (
        <Root.Screen name="Onboarding" component={OnboardingFlowScreen} />
      ) : (
        <Root.Screen name="MainApp" component={AppNavigator} />
      )}
    </Root.Navigator>
  );
};

export default RootNavigator;
