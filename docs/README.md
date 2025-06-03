# Yeser - Gratitude Journaling App

![React Native](https://img.shields.io/badge/React%20Native-0.79.2-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo-53.0.0-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)

A beautiful, feature-rich gratitude journaling app built with React Native and Expo, designed to help users cultivate mindfulness and appreciation through daily gratitude practices.

## 🌟 Features

- **Daily Gratitude Entries**: Write and manage multiple gratitude statements per day
- **Streak Tracking**: Monitor your consistency with visual streak counters
- **Throwback Memories**: Rediscover past entries with intelligent random throwbacks
- **Varied Prompts**: Get inspired with rotating daily prompts
- **Google OAuth**: Seamless authentication with Google Sign-In
- **Data Export**: Export your gratitude journey for backup or sharing
- **Customizable Reminders**: Set daily notification reminders
- **Dark/Light Theme**: Beautiful UI with theme switching
- **Offline Support**: Local data persistence with cloud sync
- **Analytics**: Firebase Analytics integration for insights

## 🏗️ Architecture

This app follows a clean, modular architecture with clear separation of concerns:

```
Frontend (React Native + Expo)
├── State Management (Zustand)
├── API Layer (Supabase Integration)
├── Services Layer (Business Logic)
├── Components (Reusable UI)
└── Screens (App Views)

Backend (Supabase)
├── PostgreSQL Database
├── RPC Functions
├── Authentication
├── Edge Functions
└── Real-time Subscriptions
```

## 📚 Documentation Structure

This documentation is organized into focused modules:

### Core Documentation
- **[Setup Guide](./01-setup.md)** - Installation and environment setup
- **[Architecture](./02-architecture.md)** - System design and patterns
- **[API Documentation](./03-api.md)** - Backend integration and endpoints
- **[State Management](./04-state-management.md)** - Zustand stores and data flow

### Development Guides
- **[Component Guide](./05-components.md)** - UI components and patterns
- **[Development Workflow](./06-development.md)** - Development best practices
- **[Testing Guide](./07-testing.md)** - Testing strategies and tools
- **[Deployment Guide](./08-deployment.md)** - Build and release process

### Reference Materials
- **[Database Schema](./09-database.md)** - Supabase database structure
- **[Environment Variables](./10-environment.md)** - Configuration reference
- **[Troubleshooting](./11-troubleshooting.md)** - Common issues and solutions
- **[Contributing](./12-contributing.md)** - Contribution guidelines

## 🚀 Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd yeser
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Fill in your Supabase and Firebase credentials
   ```

3. **Start development server:**
   ```bash
   npx expo start
   ```

4. **Open in simulator or device:**
   - iOS: Press `i` or scan QR code with Camera app
   - Android: Press `a` or scan QR code with Expo Go app

## 🛠️ Tech Stack

### Frontend
- **React Native 0.79.2** - Mobile app framework
- **Expo 53.0.0** - Development platform and tools
- **TypeScript 5.8.3** - Type safety and development experience
- **Zustand 5.0.5** - State management with persistence
- **React Navigation 7.x** - Navigation and routing
- **React Native Paper 5.14.5** - Material Design components

### Backend & Services
- **Supabase** - Database, authentication, and backend services
- **Firebase Analytics** - User analytics and insights
- **Expo Notifications** - Push notifications and reminders

### Development Tools
- **ESLint & Prettier** - Code formatting and linting
- **Jest** - Unit testing framework
- **Husky** - Git hooks for code quality
- **TypeScript** - Static type checking

## 📱 Supported Platforms

- **iOS** - iPhone and iPad (iOS 13.4+)
- **Android** - Android devices (API level 21+)
- **Web** - PWA support via Expo Web

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./12-contributing.md) for details on:
- Code of conduct
- Development workflow
- Pull request process
- Coding standards

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Supabase Documentation](https://supabase.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)

---

**Built with ❤️ by the Yeser team** 