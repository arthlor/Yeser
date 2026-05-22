import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { EventArg } from '@react-navigation/native';
import { createStackNavigator, StackCardInterpolationProps } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet } from 'react-native';

// Import screens from new locations
import CalendarViewScreen from '../features/calendar/screens/CalendarViewScreen';
import DailyEntryScreen from '../features/gratitude/screens/DailyEntryScreen';
import EntryDetailScreen from '../features/gratitude/screens/EntryDetailScreen';
import PastEntryCreationScreen from '../features/gratitude/screens/PastEntryCreationScreen';
import MoodAnalysisScreen from '../features/mood/screens/MoodAnalysisScreen';
import { CustomerCenterScreen } from '../features/subscription/screens/CustomerCenterScreen';
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
import { analyticsService } from '@/services/analyticsService';
import CustomTabBar from './CustomTabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();
const AppStack = createStackNavigator<AppStackParamList>();

const MainAppTabNavigator: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      initialRouteName="DailyEntryTab"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
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
        name="MoodAnalysis"
        component={MoodAnalysisScreen}
        options={{
          headerShown: false,
        }}
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
        name="CustomerCenter"
        component={CustomerCenterScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
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
