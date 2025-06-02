// src/types/navigation.ts
import { NavigatorScreenParams } from '@react-navigation/native';

import { GratitudeEntry } from '../schemas/gratitudeEntrySchema';

// Define ParamList types for each navigator

// For the authentication flow (e.g., Login, SignUp)
export type AuthStackParamList = {
  Login: undefined; // No params expected for Login screen
  SignUp: undefined; // No params expected for SignUp screen
  EmailConfirm: { token?: string; type?: string } | undefined; // For email verification deep link
  // Add other auth screens here, e.g., ForgotPassword: undefined;
};

// For the main application flow (once authenticated)
export type MainAppStackParamList = {
  Home: undefined; // Example: Home screen after login
  GratitudeEntry: { date: string }; // Example: Screen to add/edit an entry for a specific date
  PastEntries: undefined; // Example: Screen to view list of past entries
  Settings: undefined; // Example: App settings screen
  // Add other main app screens here
};

// For the Tab navigator within the main app flow
export type MainAppTabParamList = {
  HomeTab: undefined; // Corresponds to HomeScreen
  DailyEntryTab: { entryToEdit?: GratitudeEntry; initialDate?: string } | undefined; // Corresponds to DailyEntryScreen, can receive entryToEdit or initialDate
  PastEntriesTab: undefined; // Corresponds to PastEntriesScreen
  CalendarTab: undefined; // Added CalendarTab
  SettingsTab: undefined; // Corresponds to SettingsScreen
  // Add other tab screen params here
};

// For the Root Navigator that decides between Auth and MainApp
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainApp: NavigatorScreenParams<MainAppTabParamList>;
  Onboarding: undefined; // No params for OnboardingScreen
  OnboardingReminderSetup: undefined; // No params for OnboardingReminderSetupScreen flow
  ReminderSettings: undefined; // For reminder settings screen
  EntryDetail: { entry: GratitudeEntry }; // For displaying full entry detail
  PrivacyPolicy: undefined; // For displaying the privacy policy
  TermsOfService: undefined; // For displaying Terms of Service
  Help: undefined; // For displaying Help/FAQ screen
  // Settings: undefined; // Moved to MainAppTabParamList
  // Potentially a loading/splash screen
  // Loading: undefined;
};

// You might also want to extend ReactNavigation's global type for useNavigation hook
// declare global {
//   namespace ReactNavigation {
//     interface RootParamList extends RootStackParamList {}
//   }
// }
