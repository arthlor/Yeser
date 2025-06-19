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

## 📚 Documentation

### 🏗 Architecture & Development

- [App Architecture](./architecture.md) - High-level architecture overview
- [Development Guide](./development.md) - Setup, development workflow, and best practices
- [Build System](./build-system.md) - Build configurations and deployment
- [State Management](./state-management.md) - TanStack Query + Zustand patterns

### 🔐 Authentication & User Management

- [Authentication Flow](./auth-flow.md) - Complete auth implementation details
- [User Profiles](./user-profiles.md) - Profile management and onboarding

### 🎯 Core Features

- [Gratitude System](./gratitude-system.md) - Core journaling functionality
- [Streak & Goals](./streaks-goals.md) - Gamification and progress tracking
- [Calendar & History](./calendar-history.md) - Time-based views and navigation
- [Notifications](./notifications.md) - Reminder system implementation

### 🎨 UI/UX & Design

- [Design System](./design-system.md) - Themes, components, and styling patterns
- [Component Library](./component-library.md) - Reusable UI components
- [Accessibility](./accessibility.md) - A11y implementation and guidelines

### ⚡ Performance & Quality

- [Performance Optimization](./performance.md) - React Native performance best practices
- [Code Quality](./code-quality.md) - ESLint, TypeScript, and coding standards
- [Testing Strategy](./testing.md) - Testing approach and coverage

### 🔧 Operations & Deployment

- [Environment Configuration](./environment-config.md) - Environment variables and configuration
- [Deployment Guide](./deployment.md) - EAS Build and deployment process
- [Monitoring & Analytics](./monitoring.md) - Error tracking and user analytics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd yeser

# Install dependencies
npm install

# Start development server
npm run start:dev
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Configure Supabase credentials
3. Set up Google OAuth (optional)
4. Configure EAS project ID

See [Development Guide](./development.md) for detailed setup instructions.

## 📋 Project Structure

```
src/
├── features/           # Feature-based modules
│   ├── auth/          # Authentication system
│   ├── gratitude/     # Core gratitude functionality
│   ├── calendar/      # Calendar and history views
│   ├── settings/      # App settings and preferences
│   └── onboarding/    # User onboarding flow
├── shared/            # Shared components and utilities
│   ├── components/    # Reusable UI components
│   └── hooks/         # Custom React hooks
├── api/               # API layer and data fetching
├── services/          # Business logic services
├── store/             # Zustand state management
├── themes/            # Design system and themes
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── schemas/           # Zod validation schemas
```

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

See [Architecture Documentation](./architecture.md) for detailed data schemas.

## 🌟 Performance Achievements

The app follows strict performance optimization guidelines:

- ✅ **+15% Render Performance** (eliminated inline styles)
- ✅ **72% Bundle Size Reduction** (optimized imports)
- ✅ **86% Issue Reduction** (3,637 → 519 warnings)
- ✅ **100% Type Safety** (zero `any` types)
- ✅ **100% Hook Compliance** (complete dependency arrays)
- ✅ **Production Ready** deployment status

## 🤝 Contributing

1. Follow the [Enhanced React Native Coding Standards](../README.md#enhanced-react-native-coding-standards)
2. Use TypeScript with strict typing (no `any` types)
3. Follow the import order and performance guidelines
4. Write comprehensive tests for new features
5. Ensure accessibility compliance

## 📄 License

[Add your license information here]

## 🙏 Acknowledgments

Built with modern React Native best practices and performance optimization in mind. Special attention to accessibility, user experience, and code quality.

---

> **"Gratitude turns what we have into enough."** - Anonymous

_For detailed technical documentation, see the individual guides in the `/docs` folder._
