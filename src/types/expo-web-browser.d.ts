// src/types/expo-web-browser.d.ts
declare module 'expo-web-browser' {
  export interface WebBrowserAuthSessionResult {
    type: 'cancel' | 'dismiss' | 'error' | 'success' | string;
    url?: string;
    // Add other relevant properties if needed based on actual usage or official docs
  }

  export function openAuthSessionAsync(
    url: string,
    redirectUrl?: string // Though in our case it's often the same as the one in options or derived
    // options?: object, // Supabase example doesn't use this third param for openAuthSessionAsync
  ): Promise<WebBrowserAuthSessionResult>;

  // Declare other functions from expo-web-browser if used elsewhere, e.g.:
  // export function openBrowserAsync(url: string, options?: object): Promise<{ type: string }>;
  // export function dismissBrowser(): Promise<void>;
  // export function getCustomTabsSupportingBrowsersAsync(): Promise<object>;
}
