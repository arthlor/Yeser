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
import HelpScreen from '../features/settings/screens/HelpScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import PastEntriesScreen from '../features/calendar/screens/PastEntriesScreen';
import PrivacyPolicyScreen from '../features/settings/screens/PrivacyPolicyScreen';
import ReminderSettingsScreen from '../features/settings/screens/ReminderSettingsScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import SplashScreen from '../features/auth/screens/SplashScreen';
import TermsOfServiceScreen from '../features/settings/screens/TermsOfServiceScreen';
import OnboardingFlowScreen from '../features/onboarding/screens/EnhancedOnboardingFlowScreen';
import useAuthStore from '../store/authStore';
import { MainAppTabParamList, RootStackParamList } from '../types/navigation';
import { hapticFeedback } from '../utils/hapticFeedback';
import { getPrimaryShadow } from '@/themes/utils';
import { AppTheme } from '@/themes/types';
import { analyticsService } from '@/services/analyticsService';

// Define the Main App Tab Navigator
const Tab = createBottomTabNavigator<MainAppTabParamList>();

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
          title: 'Yeni Kayıt',
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

  // TanStack Query hook replacing useProfileStore
  const { profile, isLoadingProfile } = useUserProfile();
  const profileId = profile?.id;
  const onboarded = profile?.onboarded;

  // Add minimum splash screen duration to prevent race conditions and improve UX
  const [minimumTimeElapsed, setMinimumTimeElapsed] = React.useState(false);

  const rootStyles = React.useMemo(() => createRootStyles(theme), [theme]);

  useEffect(() => {
    void initializeAuth();
    // Call initializeAuth only once on mount as its definition is stable.
  }, [initializeAuth]);

  // Start minimum splash duration timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumTimeElapsed(true);
    }, 3000); // 3 seconds minimum duration for better animation showcase

    return () => clearTimeout(timer);
  }, []);

  // Show splash screen if auth is loading, profile is loading, or minimum time hasn't elapsed
  // This prevents race conditions and ensures consistent loading experience
  if (authIsLoading) {
    return <SplashScreen />;
  }
  if (isAuthenticated && (isLoadingProfile || !profileId)) {
    // If authenticated: show splash if profile is actively loading OR if there's no profileId yet
    // TanStack Query will automatically fetch the profile when user is authenticated
    return <SplashScreen />;
  }
  if (!minimumTimeElapsed) {
    // Ensure minimum loading time for smooth UX and to prevent race conditions
    return <SplashScreen />;
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
          title: 'Günlük Detayı',
          headerTitleAlign: 'center',
          gestureEnabled: true,
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
    </Root.Navigator>
  );
};

export default RootNavigator;
