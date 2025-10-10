import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { EventArg } from '@react-navigation/native';
import { createStackNavigator, StackCardInterpolationProps } from '@react-navigation/stack';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens from new locations
import CalendarViewScreen from '../features/calendar/screens/CalendarViewScreen';
import DailyEntryScreen from '../features/gratitude/screens/DailyEntryScreen';
import EntryDetailScreen from '../features/gratitude/screens/EntryDetailScreen';
import PastEntryCreationScreen from '../features/gratitude/screens/PastEntryCreationScreen';
import HelpScreen from '../features/settings/screens/HelpScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import PastEntriesScreen from '../features/calendar/screens/PastEntriesScreen';
import PrivacyPolicyScreen from '../features/settings/screens/PrivacyPolicyScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import TermsOfServiceScreen from '../features/settings/screens/TermsOfServiceScreen';
import { WhyGratitudeScreen } from '../features/whyGratitude';
import { useTheme } from '../providers/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { AppStackParamList, MainTabParamList } from '../types/navigation';
import { hapticFeedback } from '../utils/hapticFeedback';
import { getPrimaryShadow } from '@/themes/utils';
import { AppTheme } from '@/themes/types';
import { analyticsService } from '@/services/analyticsService';

const Tab = createBottomTabNavigator<MainTabParamList>();
const AppStack = createStackNavigator<AppStackParamList>();

const createTabBarStyles = (theme: AppTheme, insets: { bottom: number }) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      height: Platform.OS === 'ios' ? 85 + insets.bottom : 70 + insets.bottom,
      paddingTop: theme.spacing.sm,
      paddingBottom: Platform.OS === 'ios' ? theme.spacing.sm : theme.spacing.md,
      paddingHorizontal: 0,
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
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '10',
    },
    tabBarItem: {
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      marginHorizontal: theme.spacing.xs,
      flex: 1,
    },
    tabBarLabel: {
      fontSize: 10,
      fontWeight: '600',
      marginTop: 2,
      marginBottom: Platform.OS === 'ios' ? 0 : 4,
      textAlign: 'center',
    },
  });

const MainAppTabNavigator: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarStyles = React.useMemo(() => createTabBarStyles(theme, insets), [theme, insets]);

  const { t } = useTranslation();
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
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('home.tab.title'),
          tabBarAccessibilityLabel: t('home.tab.a11y'),
        }}
        listeners={{
          tabPress: (_e: EventArg<'tabPress', true>) => {
            hapticFeedback.light();
            analyticsService.logEvent('tab_navigation', {
              tab_name: 'HomeTab',
              target_screen: 'home',
            });
          },
        }}
      />
      <Tab.Screen
        name="DailyEntryTab"
        component={DailyEntryScreen}
        options={{
          title: t('navigation.tabs.dailyEntry.title'),
          tabBarAccessibilityLabel: t('navigation.tabs.dailyEntry.a11y'),
        }}
        listeners={{
          tabPress: (_e: EventArg<'tabPress', true>) => {
            hapticFeedback.medium();
            analyticsService.logEvent('tab_navigation', {
              tab_name: 'DailyEntryTab',
              target_screen: 'daily_entry',
            });
          },
        }}
      />
      <Tab.Screen
        name="PastEntriesTab"
        component={PastEntriesScreen}
        options={{
          title: t('navigation.tabs.pastEntries.title'),
          tabBarAccessibilityLabel: t('navigation.tabs.pastEntries.a11y'),
        }}
        listeners={{
          tabPress: (_e: EventArg<'tabPress', true>) => {
            hapticFeedback.light();
            analyticsService.logEvent('tab_navigation', {
              tab_name: 'PastEntriesTab',
              target_screen: 'past_entries',
            });
          },
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarViewScreen}
        options={{
          title: t('navigation.tabs.calendar.title'),
          tabBarAccessibilityLabel: t('navigation.tabs.calendar.a11y'),
        }}
        listeners={{
          tabPress: (_e: EventArg<'tabPress', true>) => {
            hapticFeedback.light();
            analyticsService.logEvent('tab_navigation', {
              tab_name: 'CalendarTab',
              target_screen: 'calendar',
            });
          },
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: t('navigation.tabs.settings.title'),
          tabBarAccessibilityLabel: t('navigation.tabs.settings.a11y'),
        }}
        listeners={{
          tabPress: (_e: EventArg<'tabPress', true>) => {
            hapticFeedback.light();
            analyticsService.logEvent('tab_navigation', {
              tab_name: 'SettingsTab',
              target_screen: 'settings',
            });
          },
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outline + '10',
          borderBottomWidth: StyleSheet.hairlineWidth,
          ...getPrimaryShadow.small(theme),
        },
        headerTintColor: theme.colors.onSurface,
        // Hide iOS back button text
        headerBackTitleStyle: { color: 'transparent' },
        headerBackTitle: ' ',
        headerTitleStyle: {
          fontFamily: theme.typography.titleLarge.fontFamily,
          fontSize: theme.typography.titleLarge.fontSize,
          fontWeight: '600',
          color: theme.colors.onSurface,
        },
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
        presentation: 'card',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
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
        headerTitleAlign: 'center',
        headerLeftContainerStyle: {
          paddingLeft: theme.spacing.md,
        },
        headerRightContainerStyle: {
          paddingRight: theme.spacing.md,
        },
      }}
    >
      <AppStack.Screen
        name="MainAppTabs"
        component={MainAppTabNavigator}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="EntryDetail"
        component={EntryDetailScreen}
        options={{ headerShown: false }}
        initialParams={{ entryId: '' }}
      />
      <AppStack.Screen
        name="PastEntryCreation"
        component={PastEntryCreationScreen}
        options={{
          title: t('navigation.screens.pastEntryCreation.title'),
          presentation: 'modal',
        }}
        initialParams={{ date: new Date().toISOString() }}
      />
      <AppStack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          title: t('settings.privacyPolicy.title'),
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <AppStack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{
          title: t('settings.terms.title'),
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <AppStack.Screen
        name="Help"
        component={HelpScreen}
        options={{
          title: t('settings.help.title'),
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <AppStack.Screen
        name="WhyGratitude"
        component={WhyGratitudeScreen}
        options={{ headerShown: false, presentation: 'card' }}
      />
    </AppStack.Navigator>
  );
};

export default AppNavigator;
