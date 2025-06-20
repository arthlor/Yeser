# Yeser - Gratitude Journaling App 🙏

> **Minnettarlık günlüğü ile hayatının güzel anlarını keşfet**  
> _Discover life's beautiful moments with your gratitude journal_

## 📱 App Overview

**Yeser** is a beautifully designed, Turkish-language gratitude journaling application built with React Native and Expo. The app helps users cultivate mindfulness and positivity by encouraging daily gratitude practice through an intuitive, performance-optimized interface.

### ✨ Key Features

- **📝 Daily Gratitude Entries** - Write multiple gratitude statements each day
- **🎯 Goal Tracking** - Set and track daily gratitude goals with progress visualization
- **🔥 Streak System** - Maintain streaks and track your longest gratitude journey
- **📅 Calendar View** - Visual calendar showing your gratitude journey over time
- **🔍 Past Entries** - Browse and reflect on previous gratitude entries
- **💡 Smart Prompts** - AI-powered prompts to inspire gratitude (optional)
- **🔔 Gentle Reminders** - Customizable daily and throwback notifications
- **🎨 Beautiful UI** - Modern, accessible design with light/dark themes
- **🚀 Performance Optimized** - Following React Native best practices for smooth experience

### 🛠 Technical Stack

- **Frontend**: React Native 0.79.4 with Expo 53
- **Backend**: Supabase (PostgreSQL + Authentication + Real-time)
- **State Management**: TanStack Query + Zustand
- **Navigation**: React Navigation v7
- **Language**: TypeScript with strict type safety
- **Validation**: Zod schemas for runtime type checking
- **Styling**: StyleSheet.create with theme system
- **Notifications**: Expo Notifications
- **Authentication**: Supabase Auth (Magic Links + Google OAuth)

## 🎯 Key Business Logic

### Core Gratitude Flow

1. **Daily Entry Creation** - Users select a date and add gratitude statements
2. **Statement Management** - Add, edit, delete individual statements via RPC functions
3. **Progress Tracking** - Visual progress toward daily goals with streak calculation
4. **Data Persistence** - All data stored in Supabase with real-time sync

### User Journey

1. **Authentication** - Magic link or Google OAuth via Supabase
2. **Onboarding** - Multi-step flow for goal setting and preference configuration
3. **Daily Practice** - Main gratitude entry interface with optional prompts
4. **Reflection** - Calendar view and past entries for reviewing gratitude journey
5. **Engagement** - Notifications and streak tracking for habit formation

## 🔒 Data Model

### Core Entities

- **Users** - Authentication and profile information
- **Gratitude Entries** - Daily entries with multiple statements
- **Streaks** - Current and longest streak tracking
- **Daily Prompts** - Optional prompts for inspiration
- **User Preferences** - Settings, goals, and notification preferences

> **"Gratitude turns what we have into enough."** - Anonymous
