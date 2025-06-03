// src/types/navigation.ts
import { NavigatorScreenParams } from '@react-navigation/native';

import { GratitudeEntry } from '../schemas/gratitudeEntrySchema';

// Define ParamList types for each navigator

// For the authentication flow (e.g., Login, SignUp)
export interface AuthStackParamList {
  Login: undefined; // No params expected for Login screen
  SignUp: undefined; // No params expected for SignUp screen
  EmailConfirm: { token?: string; type?: string } | undefined; // For email verification deep link
  // Add other auth screens here, e.g., ForgotPassword: undefined;
}

// For the main application flow (once authenticated)
export interface MainAppStackParamList {
  Home: undefined; // Example: Home screen after login
  GratitudeEntry: { date: string }; // Example: Screen to add/edit an entry for a specific date
  PastEntries: undefined; // Example: Screen to view list of past entries
  Settings: undefined; // Example: App settings screen
  // Add other main app screens here
}

// For the Tab navigator within the main app flow
export interface MainAppTabParamList {
  HomeTab: undefined; // Home screen with today's summary and quick actions
  DailyEntryTab:
    | {
        entryToEdit?: GratitudeEntry;
        initialDate?: string; // Format: YYYY-MM-DD
      }
    | undefined; // Daily entry creation/editing screen
  PastEntriesTab: undefined; // Historical entries list
  CalendarTab: undefined; // Calendar view of entries
  SettingsTab: undefined; // App settings and preferences
  // Add other tab screen params here
}

// For the Root Navigator that decides between Auth and MainApp
export interface RootStackParamList {
  // Authentication flow
  Auth: NavigatorScreenParams<AuthStackParamList>;

  // Main application flow
  MainApp: NavigatorScreenParams<MainAppTabParamList>;

  // Onboarding flow
  Onboarding: undefined; // Initial onboarding screen
  OnboardingReminderSetup: undefined; // Reminder setup during onboarding

  // Modal and overlay screens
  ReminderSettings: undefined; // Notification preferences
  EntryDetail: {
    entry: GratitudeEntry;
    allowEdit?: boolean; // Whether editing is allowed
  }; // Full entry display with optional editing

  // Legal and informational screens
  PrivacyPolicy: undefined; // Privacy policy document
  TermsOfService: undefined; // Terms of service document
  Help: undefined; // Help documentation and FAQ

  // Add other modal/overlay screens here
}

// Enhanced type definitions for better development experience
export type TabScreenName = keyof MainAppTabParamList;
export type RootScreenName = keyof RootStackParamList;

// Navigation prop types for common use cases
export type TabNavigationProp<T extends TabScreenName> = any; // Will be properly typed by navigation library
export type RootNavigationProp<T extends RootScreenName> = any; // Will be properly typed by navigation library

// You might also want to extend ReactNavigation's global type for useNavigation hook
// declare global {
//   namespace ReactNavigation {
//     interface RootParamList extends RootStackParamList {}
//   }
// }
