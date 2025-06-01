# Accessibility Implementation

This document outlines the implementation details for making the Yeşer app accessible to all users, including those with disabilities.

## Accessibility Principles

### Perceivable

- Ensure all content can be perceived by users with different abilities
- Provide text alternatives for non-text content
- Create content that can be presented in different ways
- Make it easier for users to see and hear content

### Operable

- Ensure interface components and navigation are operable
- Make all functionality available from a keyboard
- Give users enough time to read and use content
- Do not use content that causes seizures or physical reactions
- Help users navigate and find content

### Understandable

- Make text content readable and understandable
- Make content appear and operate in predictable ways
- Help users avoid and correct mistakes

### Robust

- Maximize compatibility with current and future user tools

## Implementation Guidelines

### Screen Reader Support

Ensure all UI elements are properly labeled for screen readers:

```typescript
// ❌ Avoid
<TouchableOpacity onPress={handlePress}>
  <Icon name="heart" />
</TouchableOpacity>

// ✅ Use instead
<TouchableOpacity 
  onPress={handlePress}
  accessible={true}
  accessibilityLabel="Like this post"
  accessibilityRole="button"
  accessibilityHint="Marks this post as liked"
>
  <Icon name="heart" />
</TouchableOpacity>
```

For dynamic content, update accessibility properties:

```typescript
<View
  accessible={true}
  accessibilityLabel={`Streak count: ${streak} days`}
  accessibilityLiveRegion="polite" // Announces changes
>
  <Text>Streak: {streak}</Text>
</View>
```

### Focus Management

Manage focus appropriately, especially in modals and after screen transitions:

```typescript
const inputRef = useRef(null);

useEffect(() => {
  // Focus the input when the screen mounts
  if (inputRef.current) {
    inputRef.current.focus();
  }
}, []);

return (
  <ThemedInput
    ref={inputRef}
    label="Gratitude Entry"
    // Other props
  />
);
```

For modals, trap focus within the modal while it's open:

```typescript
const ThemedModal = ({ visible, children, onDismiss }) => {
  const modalRef = useRef(null);
  
  useEffect(() => {
    if (visible && modalRef.current) {
      // Ensure the modal gets focus when opened
      modalRef.current.focus();
    }
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <View 
      ref={modalRef}
      accessible={true}
      accessibilityViewIsModal={true}
      accessibilityRole="dialog"
      // Other props
    >
      {children}
      <TouchableOpacity 
        onPress={onDismiss}
        accessible={true}
        accessibilityLabel="Close modal"
        accessibilityRole="button"
      >
        <Text>Close</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### Color Contrast

Ensure sufficient color contrast for text and interactive elements:

```typescript
// In your theme definition
const lightTheme: AppTheme = {
  colors: {
    // Primary with sufficient contrast against white (4.5:1 minimum)
    primary: '#0057B7', // Meets WCAG AA for normal text
    onPrimary: '#FFFFFF',
    
    // Surface colors with sufficient contrast for text
    surface: '#FFFFFF',
    onSurface: '#1F1F1F', // Dark gray with 14:1 contrast ratio
    
    // Error colors with sufficient contrast
    error: '#B00020', // Meets WCAG AA for normal text
    onError: '#FFFFFF',
    
    // Disabled state with sufficient contrast
    disabled: '#9E9E9E',
    onDisabled: '#1F1F1F',
  },
  // Other theme properties
};
```

Use a contrast checker tool during development to verify all color combinations meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text and UI components).

### Touch Targets

Ensure touch targets are large enough (minimum 44x44 points):

```typescript
// ❌ Avoid
<TouchableOpacity 
  onPress={handlePress}
  style={{ padding: 5 }} // Too small
>
  <Icon name="close" size={16} />
</TouchableOpacity>

// ✅ Use instead
<TouchableOpacity 
  onPress={handlePress}
  style={{ 
    padding: theme.spacing.medium,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  }}
>
  <Icon name="close" size={16} />
</TouchableOpacity>
```

### Text Scaling

Support dynamic text sizes for users who have adjusted their device settings:

```typescript
import { useWindowDimensions } from 'react-native';

const Component = () => {
  const { fontScale } = useWindowDimensions();
  
  const styles = StyleSheet.create({
    text: {
      ...theme.typography.bodyMedium,
      // Allow text to wrap when scaled
      flexWrap: 'wrap',
    },
    container: {
      // Adjust container padding based on font scale
      padding: theme.spacing.medium * Math.min(fontScale, 2),
    },
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        This text will scale based on the user's font size settings
      </Text>
    </View>
  );
};
```

### Keyboard Navigation

Support keyboard navigation for web and TV platforms:

```typescript
<TouchableOpacity
  onPress={handlePress}
  accessible={true}
  accessibilityRole="button"
  tabIndex={0} // For web keyboard navigation
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
  style={[
    styles.button,
    isFocused && styles.buttonFocused
  ]}
>
  <Text>Press Me</Text>
</TouchableOpacity>
```

### Reduced Motion

Respect the user's preference for reduced motion:

```typescript
import { AccessibilityInfo, Platform } from 'react-native';
import { useEffect, useState } from 'react';

const useReducedMotion = () => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  
  useEffect(() => {
    const checkReducedMotion = async () => {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const isReduced = await AccessibilityInfo.isReduceMotionEnabled();
        setIsReducedMotion(isReduced);
      }
    };
    
    checkReducedMotion();
    
    // Listen for changes
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReducedMotion
    );
    
    return () => {
      listener.remove();
    };
  }, []);
  
  return isReducedMotion;
};

// Usage in a component
const MyAnimatedComponent = () => {
  const isReducedMotion = useReducedMotion();
  const animationDuration = isReducedMotion ? 0 : theme.animations.duration.medium;
  
  // Use animationDuration in your animations
  // If reduced motion is enabled, animations will be instant
};
```

### Form Validation and Error Messages

Provide clear error messages and validation feedback:

```typescript
<View>
  <ThemedInput
    label="Email"
    value={email}
    onChangeText={setEmail}
    error={emailError}
    accessibilityLabel={`Email input ${emailError ? `, Error: ${emailError}` : ''}`}
    accessibilityHint="Enter your email address"
  />
  {emailError && (
    <Text
      style={styles.errorText}
      accessibilityLiveRegion="polite" // Announces when error appears
    >
      {emailError}
    </Text>
  )}
</View>
```

## Testing Accessibility

### Manual Testing

Perform manual testing with accessibility features enabled:

1. **Screen Reader Testing**:
   - iOS: Enable VoiceOver and navigate through the app
   - Android: Enable TalkBack and navigate through the app

2. **Color Contrast Testing**:
   - Use contrast checker tools to verify all text meets WCAG AA standards
   - Test with color filters enabled to simulate color blindness

3. **Text Scaling Testing**:
   - Increase text size in device settings to maximum
   - Verify all text is readable and UI elements adjust appropriately

4. **Reduced Motion Testing**:
   - Enable reduced motion in device settings
   - Verify animations are disabled or simplified

### Automated Testing

Use automated tools to catch accessibility issues:

```typescript
// In your component tests
import { axe } from 'jest-axe';

test('Component should not have accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Accessibility Checklist

Use this checklist when implementing or reviewing components:

- [ ] All interactive elements have appropriate `accessibilityRole`
- [ ] All non-text content has text alternatives (`accessibilityLabel`)
- [ ] Touch targets are at least 44x44 points
- [ ] Color contrast meets WCAG AA standards (4.5:1 for normal text)
- [ ] UI is usable with screen readers
- [ ] Content is readable when text is scaled up to 200%
- [ ] Animations respect reduced motion preferences
- [ ] Error messages are clear and announced to screen readers
- [ ] Focus order is logical and intuitive
- [ ] No content flashes more than 3 times per second
