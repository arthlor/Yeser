# Theming Integration Principles

When implementing UI/UX enhancements, follow these principles to ensure proper theming integration:

## Use Semantic Color Tokens

Always use semantic color tokens from the theme rather than hardcoded values:

```typescript
// ❌ Avoid
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE2E5',
  }
});

// ✅ Use instead
const styles = createStyles((theme: AppTheme) => ({
  container: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.outline,
  }
}));
```

## Leverage Component Variants

Use the component variant system for consistent styling:

```typescript
// ❌ Avoid
<TouchableOpacity 
  style={{ 
    backgroundColor: isDestructive ? theme.colors.error : theme.colors.primary,
    // ... other styles
  }}
>

// ✅ Use instead
<ThemedButton 
  variant={isDestructive ? 'destructive' : 'primary'} 
  // ... other props
/>
```

## Apply Consistent Spacing

Use the theme's spacing system for layout:

```typescript
// ❌ Avoid
const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 24,
  }
});

// ✅ Use instead
const styles = createStyles((theme: AppTheme) => ({
  container: {
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.large,
  }
}));
```

## Use Typography Tokens

Apply typography tokens for text styling:

```typescript
// ❌ Avoid
const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  }
});

// ✅ Use instead
const styles = createStyles((theme: AppTheme) => ({
  title: {
    ...theme.typography.h2,
  },
  body: {
    ...theme.typography.bodyMedium,
  }
}));
```

## Implement Responsive Styles

Use the theme's breakpoint system for responsive designs:

```typescript
// ❌ Avoid
const styles = StyleSheet.create({
  container: {
    padding: Dimensions.get('window').width > 375 ? 24 : 16,
  }
});

// ✅ Use instead
const styles = createStyles((theme: AppTheme) => ({
  container: {
    padding: theme.breakpoints.isSmallDevice ? theme.spacing.medium : theme.spacing.large,
  }
}));
```

## Apply Consistent Elevation

Use the theme's elevation system for shadows and depth:

```typescript
// ❌ Avoid
const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  }
});

// ✅ Use instead
const styles = createStyles((theme: AppTheme) => ({
  card: {
    ...theme.elevation.medium,
  }
}));
```

## Use Animation Tokens

Apply animation tokens for consistent motion:

```typescript
// ❌ Avoid
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  easing: Easing.ease,
  useNativeDriver: true,
}).start();

// ✅ Use instead
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: theme.animations.duration.medium,
  easing: theme.animations.easing.standard,
  useNativeDriver: true,
}).start();
```
