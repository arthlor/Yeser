// src/navigation/RootNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { EventArg } from '@react-navigation/native';
import { createStackNavigator, StackCardInterpolationProps } from '@react-navigation/stack';

import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AuthNavigator from './AuthNavigator';
import { useUserProfile } from '../hooks';
import { useTheme } from '../providers/ThemeProvider';
// Import screens from new locations
import CalendarViewScreen from '../features/calendar/screens/CalendarViewScreen';
import DailyEntryScreen from '../features/gratitude/screens/DailyEntryScreen';
import EntryDetailScreen from '../features/gratitude/screens/EntryDetailScreen';
import PastEntryCreationScreen from '../features/gratitude/screens/PastEntryCreationScreen';
import HelpScreen from '../features/settings/screens/HelpScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import PastEntriesScreen from '../features/calendar/screens/PastEntriesScreen';
import PrivacyPolicyScreen from '../features/settings/screens/PrivacyPolicyScreen';
import ReminderSettingsScreen from '../features/settings/screens/ReminderSettingsScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import SplashScreen from '../features/auth/screens/SplashScreen';
import TermsOfServiceScreen from '../features/settings/screens/TermsOfServiceScreen';
import OnboardingFlowScreen from '../features/onboarding/screens/EnhancedOnboardingFlowScreen';
import { WhyGratitudeScreen } from '../features/whyGratitude';
import useAuthStore from '../store/authStore';
import { MainTabParamList, RootStackParamList } from '../types/navigation';
import { hapticFeedback } from '../utils/hapticFeedback';
import { getPrimaryShadow } from '@/themes/utils';
import { AppTheme } from '@/themes/types';
import { analyticsService } from '@/services/analyticsService';
import { logger } from '@/utils/debugConfig';

// Define the Main App Tab Navigator
const Tab = createBottomTabNavigator<MainTabParamList>();

const createTabBarStyles = (theme: AppTheme, insets: { bottom: number }) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 0, // Edge-to-edge at top
      borderTopRightRadius: 0, // Edge-to-edge at top
      height: Platform.OS === 'ios' ? 85 + insets.bottom : 70 + insets.bottom,
      paddingTop: theme.spacing.sm,
      paddingBottom: Platform.OS === 'ios' ? theme.spacing.sm : theme.spacing.md,
      paddingHorizontal: 0, // Edge-to-edge horizontally
      // Modern edge-to-edge styling with subtle border
      borderTopColor: theme.colors.outline + '10',
      borderTopWidth: StyleSheet.hairlineWidth,
      ...getPrimaryShadow.floating(theme),
    },
    tabBarBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface,
      // Edge-to-edge background
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '10',
    },
    tabBarItem: {
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      marginHorizontal: theme.spacing.xs, // Minimal spacing between items
      flex: 1,
    },
    tabBarLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
      marginBottom: Platform.OS === 'ios' ? 0 : 4,
      textAlign: 'center',
    },
  });

const MainAppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarStyles = React.useMemo(() => createTabBarStyles(theme, insets), [theme, insets]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size: _size }) => {
          let iconName = '';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'DailyEntryTab') {
            iconName = focused ? 'plus-circle' : 'plus-circle-outline';
          } else if (route.name === 'PastEntriesTab') {
            iconName = focused ? 'history' : 'history';
          } else if (route.name === 'CalendarTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'SettingsTab') {
            iconName = focused ? 'cog' : 'cog-outline';
          }
          return <Icon name={iconName} size={focused ? 26 : 24} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: tabBarStyles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: tabBarStyles.tabBarLabel,
        tabBarItemStyle: tabBarStyles.tabBarItem,
        tabBarBackground: () => <View style={tabBarStyles.tabBarBackground} />,
        headerShown: false,
        // Modern transition animations
        cardStyleInterpolator: ({ current, layouts }: StackCardInterpolationProps) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={({ navigation: _navigation, route: _route }) => ({
          title: 'Ana Sayfa',
          tabBarAccessibilityLabel: 'Ana Sayfa sekmesi',
          listeners: {
            tabPress: (_e: EventArg<'tabPress', true>) => {
              hapticFeedback.light();
              analyticsService.logEvent('tab_navigation', {
                tab_name: 'HomeTab',
                target_screen: 'home',
              });
            },
          },
        })}
      />
      <Tab.Screen
        name="DailyEntryTab"
        component={DailyEntryScreen}
        options={({ navigation: _navigation, route: _route }) => ({
          title: 'Minnet Ekle',
          tabBarAccessibilityLabel: 'Yeni günlük kayıt oluştur',
          listeners: {
            tabPress: (_e: EventArg<'tabPress', true>) => {
              hapticFeedback.medium(); // Medium haptic for primary action
              analyticsService.logEvent('tab_navigation', {
                tab_name: 'DailyEntryTab',
                target_screen: 'daily_entry',
              });
            },
          },
        })}
      />
      <Tab.Screen
        name="PastEntriesTab"
        component={PastEntriesScreen}
        options={({ navigation: _navigation, route: _route }) => ({
          title: 'Minnetlerim',
          tabBarAccessibilityLabel: 'Geçmiş kayıtları görüntüle',
          listeners: {
            tabPress: (_e: EventArg<'tabPress', true>) => {
              hapticFeedback.light();
              analyticsService.logEvent('tab_navigation', {
                tab_name: 'PastEntriesTab',
                target_screen: 'past_entries',
              });
            },
          },
        })}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarViewScreen}
        options={({ navigation: _navigation, route: _route }) => ({
          title: 'Takvim',
          tabBarAccessibilityLabel: 'Takvim görünümü',
          listeners: {
            tabPress: (_e: EventArg<'tabPress', true>) => {
              hapticFeedback.light();
              analyticsService.logEvent('tab_navigation', {
                tab_name: 'CalendarTab',
                target_screen: 'calendar',
              });
            },
          },
        })}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={({ navigation: _navigation, route: _route }) => ({
          title: 'Ayarlar',
          tabBarAccessibilityLabel: 'Uygulama ayarları',
          listeners: {
            tabPress: (_e: EventArg<'tabPress', true>) => {
              hapticFeedback.light();
              analyticsService.logEvent('tab_navigation', {
                tab_name: 'SettingsTab',
                target_screen: 'settings',
              });
            },
          },
        })}
      />
    </Tab.Navigator>
  );
};

// Define the Root Stack that switches between Auth, MainApp, and Loading
const Root = createStackNavigator<RootStackParamList>();

const createRootStyles = (theme: AppTheme) =>
  StyleSheet.create({
    headerStyle: {
      backgroundColor: theme.colors.surface,
      // Edge-to-edge header styling with subtle border
      borderBottomColor: theme.colors.outline + '10',
      borderBottomWidth: StyleSheet.hairlineWidth,
      ...getPrimaryShadow.small(theme),
    },
    headerTitleStyle: {
      fontFamily: theme.typography.titleLarge.fontFamily,
      fontSize: theme.typography.titleLarge.fontSize,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    cardStyle: {
      backgroundColor: theme.colors.background,
    },
  });

const RootNavigator: React.FC = () => {
  const { theme } = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  // 🚨 FIX: Enhanced profile hook with error handling
  const { profile, isLoadingProfile, isProfileError, profileError } = useUserProfile();
  const onboarded = profile?.onboarded;

  // 🚨 FIX: Reduced minimum splash duration for better UX
  const [minimumTimeElapsed, setMinimumTimeElapsed] = React.useState(false);

  const rootStyles = React.useMemo(() => createRootStyles(theme), [theme]);

  useEffect(() => {
    void initializeAuth();
    // Call initializeAuth only once on mount as its definition is stable.
  }, [initializeAuth]);

  // 🚨 FIX: Shorter minimum splash duration (1.5s instead of 3s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumTimeElapsed(true);
    }, 1500); // Reduced from 3000ms to 1500ms for better UX

    return () => clearTimeout(timer);
  }, []);

  // 🚨 FIX: Handle profile fetch errors to prevent app getting stuck
  useEffect(() => {
    if (isProfileError && isAuthenticated && profileError) {
      logger.error('Profile fetch failed, logging out user:', profileError);
      // Optionally log the user out or show an error screen
      // For now, we'll log the error and let the app continue
      analyticsService.logEvent('profile_fetch_error', {
        error_message: profileError.message || 'Unknown profile error',
        is_authenticated: isAuthenticated,
      });
    }
  }, [isProfileError, isAuthenticated, profileError]);

  // 🚨 CRITICAL FIX: Profile loading timeout to prevent indefinite splash
  const profileLoadingStartRef = React.useRef<number | null>(null);

  // 🚨 CRITICAL FIX: Improved loading state logic with profile loading timeout
  const isAppLoading = React.useMemo(() => {
    // Always show splash during auth loading or minimum time
    if (authIsLoading || !minimumTimeElapsed) {
      return true;
    }

    // If user is authenticated but profile is still loading (and no error),
    // only wait for profile for maximum 5 seconds to prevent indefinite splash
    if (isAuthenticated && isLoadingProfile && !isProfileError) {
      // Initialize timer on first profile loading
      if (profileLoadingStartRef.current === null) {
        profileLoadingStartRef.current = Date.now();
      }

      const maxProfileLoadingTime = 5000; // 5 seconds max
      const loadingTime = Date.now() - profileLoadingStartRef.current;

      if (loadingTime > maxProfileLoadingTime) {
        logger.warn('Profile loading timeout - proceeding without profile data', {
          loadingTime,
          isAuthenticated,
          hasProfile: !!profile,
        });
        profileLoadingStartRef.current = null; // Reset timer
        return false; // Stop loading and proceed
      }
      return true;
    }

    // Reset timer when not loading profile
    if (profileLoadingStartRef.current !== null) {
      profileLoadingStartRef.current = null;
    }

    return false;
  }, [
    authIsLoading,
    minimumTimeElapsed,
    isAuthenticated,
    isLoadingProfile,
    isProfileError,
    profile,
  ]);

  // 🚨 FIX: Show splash screen with consolidated logic
  if (isAppLoading) {
    return <SplashScreen />;
  }

  // 🚨 FIX: Handle profile error state explicitly
  if (isAuthenticated && isProfileError && !isLoadingProfile) {
    // Profile fetch failed and we're not loading - allow app to continue
    // but log the issue for monitoring
    logger.warn('Continuing with app despite profile error', {
      error: profileError?.message,
      hasProfile: !!profile,
    });
  }

  return (
    <Root.Navigator
      screenOptions={{
        headerShown: false, // Default for most root screens
        headerStyle: rootStyles.headerStyle,
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: rootStyles.headerTitleStyle,
        cardStyle: rootStyles.cardStyle,
        presentation: 'card',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        // Modern stack transitions with edge-to-edge support
        cardStyleInterpolator: ({ current, layouts }: StackCardInterpolationProps) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
        // Enhanced header with edge-to-edge principles
        headerTitleAlign: 'center',
        headerLeftContainerStyle: {
          paddingLeft: theme.spacing.md,
        },
        headerRightContainerStyle: {
          paddingRight: theme.spacing.md,
        },
      }}
    >
      {!isAuthenticated ? (
        <Root.Screen
          name="Auth"
          component={AuthNavigator}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      ) : !onboarded ? (
        // User is authenticated but not onboarded - show the enhanced onboarding flow
        <Root.Group>
          <Root.Screen
            name="Onboarding"
            component={OnboardingFlowScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
        </Root.Group>
      ) : (
        // User is authenticated and onboarded
        <Root.Screen
          name="MainApp"
          component={MainAppNavigator}
          options={{
            headerShown: false,
          }}
        />
      )}

      {/* Modal screens with enhanced edge-to-edge styling */}
      <Root.Screen
        name="ReminderSettings"
        component={ReminderSettingsScreen}
        options={{
          headerShown: true,
          title: 'Hatırlatıcı Ayarları',
          presentation: 'modal',
          headerTitleAlign: 'center',
          gestureEnabled: true,
          headerBackTitle: '', // Remove back title text on iOS
          cardStyleInterpolator: ({ current }: StackCardInterpolationProps) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      />
      <Root.Screen
        name="EntryDetail"
        component={EntryDetailScreen}
        options={{
          headerShown: true,
          title: 'Günlük Kayıt', // Empty title to prevent "MainApp" from showing
          headerTitleAlign: 'center',
          gestureEnabled: true,
          headerBackTitle: '', // Remove back title text on iOS
          headerStyle: {
            height: 44, // Fixed header height
          },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
          },
          // Remove default header padding
          headerLeftContainerStyle: {
            paddingLeft: 16,
          },
          headerRightContainerStyle: {
            paddingRight: 16,
          },
        }}
      />
      <Root.Screen
        name="PastEntryCreation"
        component={PastEntryCreationScreen}
        options={{
          headerShown: true,
          title: 'Geçmiş Tarihe Ekle',
          presentation: 'modal',
          headerTitleAlign: 'center',
          gestureEnabled: true,
          headerBackTitle: '', // Remove back title text on iOS
        }}
      />
      <Root.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          headerShown: true,
          title: 'Gizlilik Politikası',
          presentation: 'modal',
          headerTitleAlign: 'center',
          gestureEnabled: true,
          headerBackTitle: '', // Remove back title text on iOS
          cardStyleInterpolator: ({ current }: StackCardInterpolationProps) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      />
      <Root.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{
          headerShown: true,
          title: 'Kullanım Koşulları',
          presentation: 'modal',
          headerTitleAlign: 'center',
          gestureEnabled: true,
          headerBackTitle: '', // Remove back title text on iOS
          cardStyleInterpolator: ({ current }: StackCardInterpolationProps) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      />
      <Root.Screen
        name="Help"
        component={HelpScreen}
        options={{
          headerShown: true,
          title: 'Yardım ve SSS',
          presentation: 'modal',
          headerTitleAlign: 'center',
          gestureEnabled: true,
          headerBackTitle: '', // Remove back title text on iOS
          cardStyleInterpolator: ({ current }: StackCardInterpolationProps) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      />
      <Root.Screen
        name="WhyGratitude"
        component={WhyGratitudeScreen}
        options={{
          headerShown: false, // Component handles its own header
          gestureEnabled: true,
          presentation: 'card',
        }}
      />
    </Root.Navigator>
  );
};

export default RootNavigator;
