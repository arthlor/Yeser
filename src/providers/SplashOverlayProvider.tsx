import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import EnhancedSplashScreen from '@/features/auth/screens/SplashScreen';
import useAuthStore from '@/store/authStore';
import { useUserProfile } from '@/hooks';

interface SplashOverlayProviderProps {
  children: React.ReactNode;
}

// Provider that renders the animated splash overlay on top of the entire app until all
// authentication & initial profile loading are finished. It fades out smoothly and unmounts
// itself to avoid leaving an extra view in the hierarchy.
const SplashOverlayProvider: React.FC<SplashOverlayProviderProps> = ({ children }) => {
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // We purposefully call the hook only if the user is authenticated to avoid an extra request
  const { isLoadingProfile, isProfileError } = useUserProfile();

  // Minimum visible time (1.5s) so the splash does not disappear too abruptly
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinimumTimeElapsed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const isAppLoading = useMemo(() => {
    return (
      authIsLoading ||
      !minimumTimeElapsed ||
      (isAuthenticated && isLoadingProfile && !isProfileError)
    );
  }, [authIsLoading, minimumTimeElapsed, isAuthenticated, isLoadingProfile, isProfileError]);

  // Animation handling
  const opacity = useSharedValue(1);
  const [isMounted, setIsMounted] = useState(true);

  // 🛡️ MEMORY LEAK FIX: Cleanup SharedValue on unmount
  useEffect(() => {
    return () => {
      // Reset SharedValue to initial state for better garbage collection
      opacity.value = 1;
    };
  }, [opacity]);

  useEffect(() => {
    if (!isAppLoading) {
      opacity.value = withTiming(0, { duration: 600 }, (finished) => {
        if (finished) {
          runOnJS(setIsMounted)(false);
        }
      });
    }
  }, [isAppLoading, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!isMounted) {
    return children;
  }

  return (
    <>
      {children}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.overlay, animatedStyle]}
        pointerEvents="none"
      >
        <EnhancedSplashScreen />
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
  },
});

export default SplashOverlayProvider;
