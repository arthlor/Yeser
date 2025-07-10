// src/types/navigation.ts
import { NavigatorScreenParams } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

// Define ParamList types for each navigator

// For the authentication flow - magic link and OAuth only
export interface AuthStackParamList extends Record<string, object | undefined> {
  Login: undefined; // Magic link login screen (email-only + Google OAuth)
}

// Main app tab navigator
export interface MainTabParamList extends Record<string, object | undefined> {
  HomeTab: undefined;
  DailyEntryTab: { initialDate?: string; initialPrompt?: string } | undefined;
  PastEntriesTab: undefined;
  CalendarTab: undefined;
  SettingsTab: undefined;
}

// App stack (post-authentication) that contains the main tabs and modal screens
export interface AppStackParamList extends Record<string, object | undefined> {
  MainAppTabs: NavigatorScreenParams<MainTabParamList>;
  EntryDetail: { entryId: string; entryDate?: string };
  PastEntryCreation: { date: string };
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  Help: undefined;
  WhyGratitude: undefined;
}

// Root stack that switches between auth, onboarding, and the main app
export interface RootStackParamList extends Record<string, object | undefined> {
  Splash: undefined;
  Auth: undefined;
  Onboarding: undefined;
  MainApp: NavigatorScreenParams<AppStackParamList>;
  NotFound: undefined;
}

// Additional utility types
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = {
  navigation: StackNavigationProp<AuthStackParamList, T>;
  route: { params?: AuthStackParamList[T] };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = {
  navigation: StackNavigationProp<RootStackParamList, T>;
  route: { params?: RootStackParamList[T] };
};

// Enhanced type definitions for better development experience
export type TabScreenName = keyof MainTabParamList;
export type RootScreenName = keyof RootStackParamList;

// Navigation prop types for common use cases
// These will be properly typed by the navigation library when used
export type TabNavigationProp = unknown;
export type RootNavigationProp = unknown;

// You might also want to extend ReactNavigation's global type for useNavigation hook
// declare global {
//   namespace ReactNavigation {
//     interface RootParamList extends RootStackParamList {}
//   }
// }
