# Application Flow

## 🔄 Complete User Journey

This document outlines the complete user journey through the Yeser gratitude journaling app, from first launch to daily usage.

## 📱 App Launch Flow

### 1. Cold Start Initialization

```mermaid
graph TD
    A[App Launch] --> B[Stage 1: UI Ready]
    B --> C[Stage 2: Core Services + Database]
    C --> D[Splash Screen Hidden]
    D --> E[Stage 3: Background Services]
    E --> F[Stage 4: Enhancements]
    F --> G[App Fully Initialized]

    C --> H{User Authenticated?}
    H -->|Yes| I[Main App]
    H -->|No| J[Authentication Flow]
```

### 2. Initialization Stages

- **Stage 1 (0ms)**: UI providers ready, splash screen visible
- **Stage 2 (500ms)**: Database connection, auth service, core functionality
- **Stage 3 (2000ms)**: Background sync, notifications, network monitoring
- **Stage 4 (5000ms)**: Analytics, performance monitoring, optimizations

## 🔐 Authentication Flow

### Magic Link Authentication

```mermaid
graph TD
    A[Login Screen] --> B[Enter Email]
    B --> C[Send Magic Link]
    C --> D[Email Sent Confirmation]
    D --> E[User Clicks Email Link]
    E --> F[Deep Link Handler]
    F --> G[Token Validation]
    G --> H{Valid Token?}
    H -->|Yes| I[Set User Session]
    H -->|No| J[Error Message]
    I --> K[Navigate to Main App]
```

### Authentication States

1. **Unauthenticated**: Login screen visible
2. **Magic Link Sent**: Waiting for email verification
3. **Authenticating**: Processing magic link callback
4. **Authenticated**: User session established
5. **Error**: Authentication failed

### Deep Link Handling

- **Auth Callbacks**: `/auth/callback`, `/auth/confirm`, `/confirm`, `/callback`
- **Token Processing**: OTP tokens extracted from URL parameters
- **Race Condition Prevention**: Atomic URL processing with duplicate prevention
- **Database Ready Check**: Ensures Supabase client is initialized before token processing

## 🏠 Main App Navigation Flow

### Bottom Tab Navigation

```mermaid
graph TD
    A[Main App] --> B[Home Tab]
    A --> C[Daily Entry Tab]
    A --> D[Past Entries Tab]
    A --> E[Calendar Tab]
    A --> F[Settings Tab]

    B --> G[Dashboard]
    C --> H[Entry Creation]
    D --> I[Entry List]
    E --> J[Calendar View]
    F --> K[Settings Menu]
```

### Tab Features

1. **Home Tab**: Dashboard with streaks, insights, and quick actions
2. **Daily Entry Tab**: Create new gratitude entries
3. **Past Entries Tab**: Browse historical entries
4. **Calendar Tab**: Calendar view of entries
5. **Settings Tab**: App configuration and user preferences

## ✍️ Entry Creation Flow

### Daily Entry Process

```mermaid
graph TD
    A[Daily Entry Screen] --> B{Today's Entry Exists?}
    B -->|No| C[Show Entry Form]
    B -->|Yes| D[Show Today's Entry]

    C --> E[User Types Entry]
    E --> F[Save Entry]
    F --> G[Update Streak]
    G --> H[Show Success]
    H --> I[Navigate to Home]

    D --> J[Option to Edit]
    J --> K[Edit Mode]
    K --> L[Save Changes]
```

### Past Entry Creation

```mermaid
graph TD
    A[Calendar/Past Entries] --> B[Select Date]
    B --> C{Entry Exists?}
    C -->|No| D[Create Past Entry]
    C -->|Yes| E[View/Edit Entry]

    D --> F[Past Entry Form]
    F --> G[Save Entry]
    G --> H[Update Calendar]
```

## 📅 Calendar & History Flow

### Calendar Navigation

```mermaid
graph TD
    A[Calendar Tab] --> B[Monthly View]
    B --> C[Date Selection]
    C --> D{Entry Exists?}
    D -->|Yes| E[View Entry Detail]
    D -->|No| F[Create Entry Option]

    E --> G[Edit Entry]
    E --> H[Delete Entry]
    F --> I[Past Entry Creation]
```

### Past Entries Browser

```mermaid
graph TD
    A[Past Entries Tab] --> B[Entry List]
    B --> C[Select Entry]
    C --> D[Entry Detail View]
    D --> E[Edit Entry]
    D --> F[Delete Entry]
    D --> G[Share Entry]
```

## 🎯 Onboarding Flow

### First-Time User Experience

```mermaid
graph TD
    A[First Launch] --> B[Onboarding Introduction]
    B --> C[Why Gratitude Education]
    C --> D[App Features Tour]
    D --> E[Notification Permissions]
    E --> F[First Entry Creation]
    F --> G[Onboarding Complete]
    G --> H[Navigate to Home]
```

### Onboarding Steps

1. **Welcome**: App introduction and benefits
2. **Education**: Why gratitude matters
3. **Features**: App capabilities overview
4. **Permissions**: Notification setup
5. **First Entry**: Guided entry creation
6. **Completion**: Welcome to main app

## ⚙️ Settings & Configuration Flow

### Settings Navigation

```mermaid
graph TD
    A[Settings Tab] --> B[Notification Settings]
    A --> C[Privacy Policy]
    A --> D[Terms of Service]
    A --> E[Help & Support]
    A --> F[Theme Settings]
    A --> G[Account Settings]

    B --> H[Reminder Times]
    B --> I[Notification Types]
    G --> J[Profile Management]
    G --> K[Logout]
```

### Notification Settings

- **Daily Reminders**: Customizable reminder times
- **Streak Notifications**: Encouragement and milestone celebrations
- **Weekly Summaries**: Progress reports
- **Permission Management**: Enable/disable notification types

## 🏆 Streak & Progress Flow

### Streak Calculation

```mermaid
graph TD
    A[Entry Created] --> B[Update Streak Counter]
    B --> C{Consecutive Days?}
    C -->|Yes| D[Increment Streak]
    C -->|No| E[Reset to 1]

    D --> F{Milestone Reached?}
    F -->|Yes| G[Show Celebration]
    F -->|No| H[Update Display]

    E --> I[Update Display]
```

### Progress Tracking

- **Current Streak**: Consecutive days with entries
- **Longest Streak**: Personal best record
- **Total Entries**: Lifetime entry count
- **Monthly Progress**: Current month statistics

## 🔄 Data Sync Flow

### Background Synchronization

```mermaid
graph TD
    A[App State Change] --> B{Network Available?}
    B -->|Yes| C[Sync Pending Changes]
    B -->|No| D[Queue for Later]

    C --> E[Upload Local Changes]
    E --> F[Download Remote Changes]
    F --> G[Resolve Conflicts]
    G --> H[Update Local State]

    D --> I[Network Restored]
    I --> C
```

### Offline Support

- **Local Storage**: SQLite for offline entry storage
- **Conflict Resolution**: Last-write-wins with user notification
- **Queue Management**: Pending changes queue for sync
- **Network Detection**: Automatic sync when connectivity restored

## 🔔 Notification Flow

### Notification Types

```mermaid
graph TD
    A[Notification Service] --> B[Daily Reminders]
    A --> C[Streak Milestones]
    A --> D[Weekly Summaries]
    A --> E[Encouragement Messages]

    B --> F[Scheduled Notifications]
    C --> G[Achievement Celebrations]
    D --> H[Progress Reports]
    E --> I[Motivational Content]
```

### Notification Scheduling

- **Daily Reminders**: User-configured times
- **Smart Scheduling**: Avoid notification spam
- **Time Zone Handling**: Proper local time calculation
- **Permission Management**: Graceful permission handling

## 🎉 Special Features Flow

### Throwback Memories

```mermaid
graph TD
    A[Home Screen] --> B[Throwback Widget]
    B --> C[Random Past Entry]
    C --> D[Display Memory]
    D --> E[User Interaction]
    E --> F[View Full Entry]
    E --> G[Share Memory]
```

### Why Gratitude Education

```mermaid
graph TD
    A[Educational Content] --> B[Science of Gratitude]
    B --> C[Benefits Overview]
    C --> D[Practice Tips]
    D --> E[Research Citations]
    E --> F[Return to App]
```

## 🔄 Error Handling Flow

### Error Recovery

```mermaid
graph TD
    A[Error Occurs] --> B{Error Type?}
    B -->|Network| C[Show Offline Mode]
    B -->|Auth| D[Redirect to Login]
    B -->|Validation| E[Show Field Errors]
    B -->|Server| F[Show Retry Option]

    C --> G[Queue Actions]
    D --> H[Clear Session]
    E --> I[Highlight Issues]
    F --> J[Retry Logic]
```

### Error Types

- **Network Errors**: Offline mode activation
- **Authentication Errors**: Session refresh or re-login
- **Validation Errors**: Form field highlighting
- **Server Errors**: Retry mechanisms
- **Client Errors**: Graceful degradation

## 📊 Analytics & Tracking Flow

### Event Tracking

```mermaid
graph TD
    A[User Action] --> B[Analytics Service]
    B --> C[Event Processing]
    C --> D[Firebase Analytics]
    C --> E[Local Analytics]

    D --> F[Remote Dashboard]
    E --> G[App Insights]
```

### Tracked Events

- **User Engagement**: Screen views, interaction times
- **Feature Usage**: Entry creation, calendar navigation
- **Performance**: App load times, error rates
- **Business Metrics**: Retention, streak completion

This comprehensive flow documentation covers all major user journeys and system interactions within the Yeser gratitude journaling application.
