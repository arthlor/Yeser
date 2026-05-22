// src/navigation/RootNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';
import { useUserProfile } from '../hooks';
import OnboardingFlowScreen from '../features/onboarding/screens/EnhancedOnboardingFlowScreen';
import SplashScreen from '../features/auth/screens/SplashScreen';
import ProfileErrorScreen from '../features/auth/screens/ProfileErrorScreen';
import NotFoundScreen from '../features/auth/screens/NotFoundScreen';
import { useCoreAuthStore } from '../features/auth/store/coreAuthStore';
import { RootStackParamList } from '../types/navigation';

const Root = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const isAuthenticated = useCoreAuthStore((state) => state.isAuthenticated);
  const authIsLoading = useCoreAuthStore((state) => state.isLoading);
  const { profile, isLoadingProfile, isProfileError, profileError, refetchProfile } =
    useUserProfile();
  const onboarded = profile?.onboarded;

  // Auth initialization is handled in App.tsx - no need for duplicate call here

  // Remove verbose auth-state debug logs

  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      {authIsLoading ? (
        // Still determining auth state → show splash
        <Root.Screen name="Splash" component={SplashScreen} />
      ) : !isAuthenticated ? (
        // Not authenticated → go to auth flow
        <>
          <Root.Screen name="Auth" component={AuthNavigator} />
          <Root.Screen name="NotFound" component={NotFoundScreen} />
        </>
      ) : isLoadingProfile ? (
        // Authenticated but profile not loaded yet → keep splash to avoid onboarding flash
        <Root.Screen name="Splash" component={SplashScreen} />
      ) : isProfileError ? (
        // Profile failed to load → show retryable error state
        <Root.Screen name="ProfileError">
          {() => <ProfileErrorScreen error={profileError} onRetry={refetchProfile} />}
        </Root.Screen>
      ) : !onboarded ? (
        // Profile loaded and user not onboarded → onboarding
        <>
          <Root.Screen name="Onboarding" component={OnboardingFlowScreen} />
          <Root.Screen name="NotFound" component={NotFoundScreen} />
        </>
      ) : (
        // Fully ready → main app. The paywall is presented as a native
        // modal via RevenueCatUI.presentPaywall() (see
        // `presentNativePaywall`), so it does not need a React Navigation
        // route.
        <>
          <Root.Screen name="MainApp" component={AppNavigator} />
          <Root.Screen name="NotFound" component={NotFoundScreen} />
        </>
      )}
    </Root.Navigator>
  );
};

export default RootNavigator;
