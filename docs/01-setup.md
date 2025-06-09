# Setup Guide

This guide will walk you through setting up the Yeşer gratitude app development environment from scratch. The app uses a modern hybrid architecture with TanStack Query for server state management, Zustand for client state, and **magic link authentication** for enhanced security.

## 📋 Prerequisites

### Required Software

1. **Node.js (18.x or higher)**

   ```bash
   # Check your Node.js version
   node --version

   # Install via nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **npm or Yarn Package Manager**

   ```bash
   # Check npm version
   npm --version

   # Or install Yarn
   npm install -g yarn
   ```

3. **Git**

   ```bash
   # Check Git installation
   git --version
   ```

4. **Expo CLI**

   ```bash
   # Install Expo CLI globally
   npm install -g @expo/cli

   # Verify installation
   expo --version
   ```

### Development Environment

#### For iOS Development (macOS only)

1. **Xcode** (latest version from App Store)
2. **iOS Simulator** (included with Xcode)
3. **Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

#### For Android Development

1. **Android Studio** with Android SDK
2. **Android Emulator** or physical device
3. **Java Development Kit (JDK)**

### Mobile Testing Options

- **Expo Go App** (iOS/Android) - for quick testing
- **Physical Device** - for real-world testing and magic link testing
- **Simulators/Emulators** - for development

## 🚀 Installation Steps

### 1. Clone the Repository

```bash
# Clone the project
git clone <repository-url>
cd yeser

# Install dependencies
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..
```

### 2. Modern Architecture Overview

This setup guide covers a **hybrid architecture** that provides:

- **TanStack Query**: Intelligent server state management with automatic caching, background sync, and optimistic updates
- **Zustand**: Lightweight client state for UI preferences, themes, and auth state
- **Magic Link Authentication**: Passwordless security with Supabase
- **Type Safety**: Full TypeScript integration with excellent developer experience
- **Offline-First**: Robust data persistence and synchronization

**Key Benefits:**

- 90% reduction in state management boilerplate
- Automatic background synchronization
- Built-in error handling and retry logic
- Enhanced security with passwordless authentication
- Excellent developer tooling and debugging

### 3. Environment Configuration

#### Create Environment File

```bash
# Copy example environment file
cp .env.example .env
```

#### Configure Environment Variables

Edit `.env` file with your credentials:

```env
# Supabase Configuration (Required for Magic Links)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Magic Link Configuration
EXPO_PUBLIC_MAGIC_LINK_REDIRECT_URI=your_magic_link_redirect_uri
EXPO_PUBLIC_DEEP_LINK_SCHEME=yeser

# OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_REDIRECT_URI=your_oauth_redirect_uri

# Firebase Configuration (for Analytics)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id

# App Configuration
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.com

# Development Tools
EXPO_PUBLIC_REACT_QUERY_DEVTOOLS=true  # Enable TanStack Query DevTools
```

### 4. Backend Setup (Supabase)

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

#### Enhanced Authentication Configuration

##### Enable Magic Links

1. Go to Supabase Dashboard → Authentication → Settings
2. Enable "Email" provider
3. Configure email templates:

   ```html
   <!-- Magic Link Email Template -->
   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
     <div
       style="background: linear-gradient(135deg, #0F766E 0%, #14B8A6 100%); padding: 40px 20px; text-align: center;"
     >
       <h1 style="color: white; margin: 0; font-size: 28px;">🌱 Yeşer</h1>
       <p style="color: #E6FFFA; margin: 10px 0 0 0; font-size: 16px;">Şükran Günlüğün</p>
     </div>

     <div style="padding: 40px 20px; background: white;">
       <h2 style="color: #1F2937; margin: 0 0 20px 0;">Giriş Bağlantın Hazır!</h2>
       <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">
         Yeşer uygulamasına güvenli bir şekilde giriş yapmak için aşağıdaki butona tıkla:
       </p>

       <div style="text-align: center; margin: 30px 0;">
         <a
           href="{{ .ConfirmationURL }}"
           style="background: linear-gradient(135deg, #0F766E 0%, #14B8A6 100%); 
                   color: white; 
                   padding: 16px 32px; 
                   text-decoration: none; 
                   border-radius: 12px; 
                   font-weight: 600; 
                   display: inline-block;"
         >
           🔐 Güvenli Giriş Yap
         </a>
       </div>

       <p style="color: #9CA3AF; font-size: 14px; text-align: center;">
         Bu bağlantı 24 saat süreyle geçerlidir ve sadece bir kez kullanılabilir.
       </p>
     </div>
   </div>
   ```

4. Set up redirect URLs:
   ```
   yeser://auth/callback
   https://your-domain.com/auth/callback
   ```

##### Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Configure authorized redirect URIs:
   ```
   https://your-supabase-project.supabase.co/auth/v1/callback
   ```
4. In Supabase Dashboard → Authentication → Settings:
   - Add Google OAuth provider
   - Enter Client ID and Client Secret

#### Database Schema Setup

```sql
-- Run these SQL commands in Supabase SQL Editor

-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table with enhanced fields
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  username TEXT,
  onboarded BOOLEAN DEFAULT FALSE,

  -- Notification settings
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_time TEXT DEFAULT '20:00:00',
  throwback_reminder_enabled BOOLEAN DEFAULT TRUE,
  throwback_reminder_frequency TEXT DEFAULT 'weekly',
  throwback_reminder_time TEXT DEFAULT '10:00:00',

  -- Gratitude settings
  daily_gratitude_goal INTEGER DEFAULT 3,
  use_varied_prompts BOOLEAN DEFAULT FALSE,

  -- Authentication metadata
  auth_provider TEXT DEFAULT 'magic_link',
  last_sign_in_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gratitude_entries table
CREATE TABLE gratitude_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  statements JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

-- Create streaks table
CREATE TABLE streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_entry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_prompts table for varied prompts feature
CREATE TABLE daily_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_text_tr TEXT NOT NULL,
  prompt_text_en TEXT,
  category TEXT DEFAULT 'daily_life',
  difficulty_level TEXT DEFAULT 'beginner',
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample prompts
INSERT INTO daily_prompts (prompt_text_tr, prompt_text_en, category, difficulty_level) VALUES
('Bugün seni mutlu eden küçük bir şey neydi?', 'What small thing made you happy today?', 'daily_life', 'beginner'),
('Hangi özelliğin için kendine teşekkür etmek istiyorsun?', 'What quality do you want to thank yourself for?', 'growth', 'intermediate'),
('Hayatındaki en değerli ilişki hangisi ve neden?', 'What is your most valuable relationship and why?', 'relationships', 'advanced');
```

#### Enhanced RPC Functions Setup

```sql
-- Create enhanced RPC functions (see 09-database.md for complete functions)

-- Magic link rate limiting function
CREATE OR REPLACE FUNCTION check_magic_link_rate_limit(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_attempts INTEGER;
BEGIN
  -- Check attempts in last hour
  SELECT COUNT(*) INTO recent_attempts
  FROM auth.audit_log_entries
  WHERE created_at > NOW() - INTERVAL '1 hour'
  AND payload->>'email' = user_email
  AND payload->>'action' = 'magic_link_sent';

  -- Allow max 5 attempts per hour
  RETURN recent_attempts < 5;
END;
$$;

-- Enhanced profile creation on auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    auth_provider,
    last_sign_in_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'magic_link'),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```

#### Enhanced Row Level Security Policies

```sql
-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Gratitude entries policies
CREATE POLICY "Users can view own entries" ON gratitude_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON gratitude_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON gratitude_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON gratitude_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Streaks policies
CREATE POLICY "Users can view own streak" ON streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak" ON streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak" ON streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Daily prompts policies (read-only for users)
CREATE POLICY "Everyone can view active prompts" ON daily_prompts
  FOR SELECT USING (is_active = true);
```

### 5. Deep Link Configuration

#### iOS Configuration

Add to `ios/yeser/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>yeser-auth</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>yeser</string>
    </array>
  </dict>
</array>
```

#### Android Configuration

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="yeser" />
</intent-filter>
```

#### Expo Configuration

Update `app.json`:

```json
{
  "expo": {
    "scheme": "yeser",
    "name": "Yeşer",
    "slug": "yeser-gratitude",
    "plugins": [
      [
        "expo-linking",
        {
          "scheme": "yeser"
        }
      ]
    ]
  }
}
```

### 6. Firebase Setup (Optional - for Analytics)

#### Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Add iOS and Android apps
4. Download configuration files

#### Install Firebase Config

```bash
# Download google-services.json (Android)
# Place in android/app/google-services.json

# Download GoogleService-Info.plist (iOS)
# Place in ios/YourApp/GoogleService-Info.plist
```

## 🔧 Development Tools Setup

### TanStack Query DevTools Setup

The app includes React Query DevTools for debugging server state:

```typescript
// DevTools are automatically configured in src/providers/QueryProvider.tsx
// They'll show in development when EXPO_PUBLIC_REACT_QUERY_DEVTOOLS=true

// Access DevTools by:
// 1. Shaking your device/simulator
// 2. Opening developer menu
// 3. Selecting "Toggle Query DevTools"
```

### VS Code Extensions (Recommended)

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-eslint",
    "esbenp.prettier-vscode",
    "expo.vscode-expo-tools",
    "ms-vscode.vscode-react-native",
    "tanstack.query-devtools",
    "supabase.supabase"
  ]
}
```

### Git Hooks Setup

```bash
# Husky is already configured, but you can verify:
npx husky install

# Verify pre-commit hooks work
git add .
git commit -m "test commit"
```

## ✅ Verification Steps

### 1. Test Basic Setup

```bash
# Start development server
npx expo start

# Should see QR code and no errors
```

### 2. Test Modern Architecture Components

#### TanStack Query Integration

1. Open app in Expo Go
2. Navigate to any screen with data (Home, Past Entries)
3. Open React Query DevTools (shake device → "Toggle Query DevTools")
4. Verify queries are loading, caching, and updating

#### Zustand Client State

1. Toggle between light/dark theme
2. Check that preferences persist between app restarts
3. Verify auth state management

### 3. Test Database Connection

```bash
# Run a simple test to verify Supabase connection
npm run test:connection
```

### 4. Test Magic Link Authentication

1. Open app in Expo Go on physical device (required for email testing)
2. Enter your email address
3. Check email for magic link
4. Click magic link on device
5. Verify automatic app opening and login

**Important**: Magic link testing requires a physical device as simulators cannot properly handle email links.

### 5. Test Google OAuth

1. Open app in Expo Go
2. Try Google Sign-In
3. Verify profile creation and automatic onboarding

### 6. Test Core Features with Modern State Management

1. **Create a gratitude entry** - Should show optimistic update
2. **Go offline** - App should continue working with cached data
3. **Go back online** - Should automatically sync changes
4. **View past entries** - Should load from cache instantly
5. **Check streak counter** - Should update reactively
6. **Test notifications** - Verify reminder settings work

## 🛠️ Common Issues & Solutions

### Magic Link Issues

#### Links Not Opening App

```bash
# Check deep link configuration
npx expo install expo-linking
npx expo install expo-auth-session

# Verify URL scheme in app.json
```

#### Email Delivery Issues

```bash
# Check Supabase email settings
# Verify SMTP configuration
# Test with different email providers

# Check rate limiting
SELECT * FROM auth.audit_log_entries
WHERE payload->>'action' = 'magic_link_sent'
ORDER BY created_at DESC LIMIT 10;
```

#### Token Extraction Problems

```typescript
// Debug deep link handling
import * as Linking from 'expo-linking';

const handleDeepLink = (url: string) => {
  console.log('Deep link received:', url);
  const parsed = Linking.parse(url);
  console.log('Parsed URL:', parsed);

  // Extract tokens and debug
  const { queryParams } = parsed;
  console.log('Query params:', queryParams);
};
```

### Node.js Version Issues

```bash
# If you get Node.js version errors
nvm use 18
npm install
```

### iOS Simulator Issues

```bash
# Reset iOS Simulator
npx expo run:ios --clear
```

### Android Build Issues

```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx expo run:android
```

### Environment Variable Issues

```bash
# Restart Metro bundler after changing .env
npx expo start --clear
```

### TanStack Query Issues

```bash
# If queries aren't working
# 1. Check network connectivity in DevTools
# 2. Verify Supabase credentials in .env
# 3. Check browser/app console for errors

# Clear query cache if needed
# Restart Metro bundler
npx expo start --clear
```

## 📱 Platform-Specific Setup

### iOS Setup

1. **Xcode Configuration**

   - Open `ios/yeser.xcworkspace` in Xcode
   - Select development team
   - Configure signing certificates

2. **Info.plist Configuration**

   ```xml
   <!-- Enhanced URL schemes for magic links -->
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLName</key>
       <string>yeser</string>
       <key>CFBundleURLSchemes</key>
       <array>
         <string>yeser</string>
       </array>
     </dict>
   </array>

   <!-- Email handling permissions -->
   <key>LSApplicationQueriesSchemes</key>
   <array>
     <string>mailto</string>
   </array>
   ```

### Android Setup

1. **Gradle Configuration**

   - Verify `android/app/build.gradle` settings
   - Check signing configuration

2. **Manifest Configuration**

   ```xml
   <!-- Enhanced intent filters for magic links -->
   <intent-filter android:autoVerify="true">
     <action android:name="android.intent.action.VIEW" />
     <category android:name="android.intent.category.DEFAULT" />
     <category android:name="android.intent.category.BROWSABLE" />
     <data android:scheme="yeser" />
   </intent-filter>

   <!-- Email handling -->
   <intent-filter>
     <action android:name="android.intent.action.VIEW" />
     <category android:name="android.intent.category.DEFAULT" />
     <category android:name="android.intent.category.BROWSABLE" />
     <data android:scheme="mailto" />
   </intent-filter>
   ```

## 🎯 Next Steps

After completing the setup:

1. **Read the [Architecture Guide](./02-architecture.md)** to understand the codebase structure
2. **Review [Development Workflow](./06-development.md)** for best practices
3. **Check [Component Guide](./05-components.md)** to understand UI patterns
4. **Test magic link authentication** thoroughly on physical devices
5. **Start developing!** 🚀

## 📞 Support

If you encounter issues during setup:

1. Check the [Troubleshooting Guide](./11-troubleshooting.md)
2. Review Expo documentation for deep linking
3. Check Supabase documentation for magic links
4. Test authentication flows on physical devices
5. Create an issue in the repository

---

**Happy coding! 🎉**
