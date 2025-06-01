# Performance Testing

**Focus:** Ensure the app is responsive, loads quickly, scrolls smoothly, and uses system resources (CPU, memory, battery) efficiently.

**Tools:** Expo Profiler, React Native Flipper plugins (if applicable), Supabase query performance monitoring, manual observation.

**Scope (Based on Phases 0-2 Features):**

### 1. App Launch Time
- **Cold Start:** Time taken for the app to become interactive from a terminated state.
- **Warm Start:** Time taken when the app is already in memory but not in the foreground.
- Measure on various devices, especially mid to low-end ones.

### 2. Screen Load Times
- Time taken for each major screen to load its content and become interactive:
  - `LoginScreen`, `SignUpScreen`
  - `HomeScreen` (or main dashboard)
  - `DailyEntryScreen`
  - `PastEntriesScreen` (especially with many entries)
  - `EntryDetailScreen`
  - `SettingsScreen`
- Identify screens with heavy data fetching or complex rendering.

### 3. UI Responsiveness & Smoothness
- **List Scrolling:**
  - `PastEntriesScreen`: Smooth scrolling with a significant number of entries (e.g., 50, 100, 200+). Check for frame drops or jankiness.
  - Test `FlatList` optimization (e.g., `keyExtractor`, `getItemLayout` if applicable, `windowSize`).
- **Animations & Transitions:**
  - Navigation transitions between screens.
  - Any custom animations (e.g., "Gratitude Blooming" visual).
  - Ensure they are smooth and run at a high frame rate (ideally 60 FPS).
- **Input Responsiveness:**
  - Typing in text fields.
  - Tapping buttons and other interactive elements.
  - No noticeable lag.

### 4. API Response Times (Client-Perceived)
- Monitor time taken for Supabase API calls to complete from the client's perspective:
  - Login/Sign Up.
  - Fetching profile.
  - Saving/fetching/editing/deleting gratitude entries.
  - Calculating streak.
- Identify slow queries or operations via Supabase dashboard and client-side timing.

### 5. CPU Usage
- Monitor CPU usage during common tasks:
  - Idle state.
  - Scrolling lists.
  - Performing complex calculations (if any).
  - Background tasks (e.g., related to notifications, though these are usually OS-handled once scheduled).
- Identify CPU spikes or sustained high usage.

### 6. Memory Usage
- Monitor memory footprint of the app.
- Check for memory leaks, especially in long-running sessions or after navigating through many screens.
- Pay attention to `FlatList` memory usage with large datasets.

### 7. Battery Usage
- Monitor battery consumption during typical usage patterns.
- Identify features or background processes that might be draining the battery excessively (less common for this type of app unless there are poorly optimized background tasks, which are not a primary feature yet beyond notification scheduling).

### 8. Offline/Network Fluctuation Impact
- While not strictly performance, test how the app behaves with slow or intermittent network conditions.
  - Does it block UI excessively?
  - Are there appropriate loading indicators and error messages?

**Methodology:**
- Use Expo Profiler and Flipper to identify JavaScript and native performance bottlenecks (re-renders, long-running functions).
- Test on a range of real devices (iOS and Android, different performance characteristics).
- Simulate large amounts of data for lists.
- Monitor Supabase dashboard for slow database queries or RPC calls.
- Perform baseline measurements and compare after significant changes.
