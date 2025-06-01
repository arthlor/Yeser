# Component Enhancements

This document details the implementation specifics for enhanced components in the Yeşer app.

## Themed Base Components

### ThemedCard

The `ThemedCard` component has been enhanced with the following features:

- Support for multiple variants: `elevated`, `outlined`, and `filled`
- Configurable elevation levels that map to theme-based shadow styles
- Proper theming integration for background, border, and shadow colors
- Customizable content padding based on theme spacing tokens
- Accessibility improvements including proper focus handling

Implementation example:
```tsx
<ThemedCard 
  variant="elevated" 
  elevation="medium"
  contentPadding="medium"
  onPress={handleCardPress}
>
  <Text style={styles.cardTitle}>Card Title</Text>
  <Text style={styles.cardContent}>Card content goes here</Text>
</ThemedCard>
```

### ThemedInput

The `ThemedInput` component now includes:

- Support for labels that animate on focus/blur
- Error, success, and helper message display
- Leading and trailing icon support
- Focus animations with theme-based timing
- Proper keyboard handling and form integration
- Full accessibility support

Implementation example:
```tsx
<ThemedInput
  label="Email Address"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  error={emailError}
  helperText="Enter your registered email"
  leadingIcon="mail-outline"
/>
```

### ThemedModal

The `ThemedModal` component has been enhanced with:

- Proper accessibility support including focus trapping
- Entrance and exit animations using theme duration tokens
- Backdrop press handling with haptic feedback
- Support for different modal sizes and positions
- Proper handling of the device's safe area

Implementation example:
```tsx
<ThemedModal
  visible={isModalVisible}
  onDismiss={closeModal}
  title="Confirmation"
  animationType="slide"
>
  <Text style={styles.modalText}>Are you sure you want to proceed?</Text>
  <View style={styles.buttonContainer}>
    <ThemedButton variant="secondary" onPress={closeModal}>Cancel</ThemedButton>
    <ThemedButton variant="primary" onPress={handleConfirm}>Confirm</ThemedButton>
  </View>
</ThemedModal>
```

### ThemedDivider

The `ThemedDivider` component now includes:

- Proper theme integration for color and thickness
- Support for vertical and horizontal orientations
- Customizable spacing and insets
- Accessibility improvements to ensure it's properly announced by screen readers

Implementation example:
```tsx
<ThemedDivider 
  orientation="horizontal" 
  thickness="thin"
  spacing="medium" 
/>
```

### ThemedList

The `ThemedList` component has been enhanced with:

- Proper theme typing for consistent styling
- Platform-specific styling for native feel
- Support for various list item types and configurations
- Proper handling of separators and spacing

Implementation example:
```tsx
<ThemedList
  data={items}
  renderItem={renderItem}
  separatorStyle="inset"
  emptyState={<EmptyState message="No items found" />}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
/>
```

## Animation Components

### FadeIn

A reusable component for fade-in transitions:

```tsx
<FadeIn duration={theme.animations.duration.medium} delay={100}>
  <Text>This text will fade in</Text>
</FadeIn>
```

### SlideIn

A component for slide-in transitions from different directions:

```tsx
<SlideIn 
  direction="bottom" 
  duration={theme.animations.duration.medium}
  distance={20}
>
  <Text>This text will slide in from the bottom</Text>
</SlideIn>
```

### ScaleIn

A component for scale-in transitions:

```tsx
<ScaleIn 
  duration={theme.animations.duration.medium}
  initialScale={0.9}
>
  <Text>This text will scale in</Text>
</ScaleIn>
```

### useAnimatedValue

A custom hook for simplified animation creation:

```tsx
const fadeAnim = useAnimatedValue(0);

// Later in your component
useEffect(() => {
  fadeAnim.animateTo(1, {
    duration: theme.animations.duration.medium,
    easing: theme.animations.easing.standard
  });
}, []);

// Use in style
<Animated.View style={{ opacity: fadeAnim.value }}>
  <Text>Animated content</Text>
</Animated.View>
```

## State Components

### LoadingState

A component for displaying loading indicators with optional messages:

```tsx
<LoadingState 
  message="Loading your entries..." 
  spinnerSize="large"
  spinnerColor={theme.colors.primary}
/>
```

### ErrorState

A component for displaying error messages with retry options:

```tsx
<ErrorState
  message="Failed to load entries"
  icon="alert-circle"
  onRetry={handleRetry}
  retryButtonText="Try Again"
/>
```

### EmptyState

A component for displaying empty state messages with action buttons:

```tsx
<EmptyState
  message="No entries yet"
  subMessage="Start by adding your first gratitude entry"
  icon="book-outline"
  actionButton={{
    label: "Add Entry",
    onPress: navigateToAddEntry
  }}
/>
```

## Enhanced Feature Components

### EnhancedStreakVisual

An upgraded streak visualization with animations and milestone celebrations:

```tsx
<EnhancedStreakVisual
  streak={userStreak}
  onMilestoneReached={handleMilestone}
  showAnimation={true}
  size="large"
/>
```

The component includes:
- Dynamic visual representation that changes based on streak milestones
- Celebration animations when reaching significant milestones (7, 30, 100 days)
- Haptic feedback for milestone achievements
- Proper theming integration for colors and animations
