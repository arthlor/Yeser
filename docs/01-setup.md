# Setup Guide

This guide will walk you through setting up the Yeser gratitude app development environment from scratch.

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
- **Physical Device** - for real-world testing
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

### 2. Environment Configuration

#### Create Environment File
```bash
# Copy example environment file
cp .env.example .env
```

#### Configure Environment Variables
Edit `.env` file with your credentials:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OAuth Configuration
EXPO_PUBLIC_REDIRECT_URI=your_oauth_redirect_uri

# Firebase Configuration (for Analytics)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id

# App Configuration
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.com
```

### 3. Backend Setup (Supabase)

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

#### Database Schema Setup
```sql
-- Run these SQL commands in Supabase SQL Editor

-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  onboarded BOOLEAN DEFAULT FALSE,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_time TEXT DEFAULT '20:00:00',
  throwback_reminder_enabled BOOLEAN DEFAULT TRUE,
  throwback_reminder_frequency TEXT DEFAULT 'weekly',
  daily_gratitude_goal INTEGER DEFAULT 3,
  use_varied_prompts BOOLEAN DEFAULT FALSE,
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

-- Create daily_prompts table
CREATE TABLE daily_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_text_tr TEXT NOT NULL,
  prompt_text_en TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### RPC Functions Setup
```sql
-- Create RPC functions (see 09-database.md for complete functions)

-- Example: Add gratitude statement function
CREATE OR REPLACE FUNCTION add_gratitude_statement(
  p_entry_date DATE,
  p_statement TEXT
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  entry_date DATE,
  statements JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Function implementation here
$$;
```

#### Row Level Security Policies
```sql
-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Gratitude entries policies
CREATE POLICY "Users can view own entries" ON gratitude_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON gratitude_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Similar policies for other tables...
```

### 4. Firebase Setup (Optional - for Analytics)

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

### 5. OAuth Setup (Google Sign-In)

#### Configure Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Configure authorized redirect URIs:
   ```
   https://your-supabase-project.supabase.co/auth/v1/callback
   ```

#### Update Supabase Auth Settings
1. Go to Supabase Dashboard → Authentication → Settings
2. Add Google OAuth provider
3. Enter Client ID and Client Secret

## 🔧 Development Tools Setup

### VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-eslint",
    "esbenp.prettier-vscode",
    "expo.vscode-expo-tools",
    "ms-vscode.vscode-react-native"
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

### 2. Test Database Connection
```bash
# Run a simple test to verify Supabase connection
npm run test:connection
```

### 3. Test Authentication
1. Open app in Expo Go
2. Try Google Sign-In
3. Verify profile creation

### 4. Test Core Features
1. Create a gratitude entry
2. View past entries
3. Check streak counter

## 🐛 Common Issues

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

## 📱 Platform-Specific Setup

### iOS Setup
1. **Xcode Configuration**
   - Open `ios/yeser.xcworkspace` in Xcode
   - Select development team
   - Configure signing certificates

2. **Info.plist Configuration**
   ```xml
   <!-- Add to ios/yeser/Info.plist -->
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
   ```

### Android Setup
1. **Gradle Configuration**
   - Verify `android/app/build.gradle` settings
   - Check signing configuration

2. **Manifest Configuration**
   ```xml
   <!-- Add to android/app/src/main/AndroidManifest.xml -->
   <intent-filter android:autoVerify="true">
     <action android:name="android.intent.action.VIEW" />
     <category android:name="android.intent.category.DEFAULT" />
     <category android:name="android.intent.category.BROWSABLE" />
     <data android:scheme="yeser" />
   </intent-filter>
   ```

## 🎯 Next Steps

After completing the setup:

1. **Read the [Architecture Guide](./02-architecture.md)** to understand the codebase structure
2. **Review [Development Workflow](./06-development.md)** for best practices
3. **Check [Component Guide](./05-components.md)** to understand UI patterns
4. **Start developing!** 🚀

## 📞 Support

If you encounter issues during setup:

1. Check the [Troubleshooting Guide](./11-troubleshooting.md)
2. Review Expo documentation
3. Check Supabase documentation
4. Create an issue in the repository

---

**Happy coding! 🎉** 