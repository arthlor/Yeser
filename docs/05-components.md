 # Component Guide

This document provides comprehensive documentation for the UI components architecture in the Yeser gratitude app, including design patterns, theming system, and component library.

## 🎨 Component Architecture

### Design Philosophy

Yeser follows a **component-driven architecture** with emphasis on:
- **Reusability**: Components designed for multiple use cases
- **Consistency**: Unified design language across the app
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Optimized rendering and memory usage
- **Theming**: Consistent dark/light theme support

### Component Hierarchy

```
Components
├── Themed Base Components      # Foundation layer
│   ├── ThemedButton           # Interactive elements
│   ├── ThemedInput            # Form controls
│   ├── ThemedCard             # Content containers
│   ├── ThemedModal            # Overlay components
│   └── ThemedDivider          # Layout helpers
├── Feature Components          # Business logic layer
│   ├── GratitudeInputBar      # Core functionality
│   ├── GratitudeStatementItem # Content display
│   ├── EnhancedStreakVisual   # Data visualization
│   └── ThrowbackModal         # Special features
├── Screen Components           # Page layer
│   ├── EnhancedHomeScreen     # Main screens
│   ├── EnhancedDailyEntryScreen
│   └── EnhancedSettingsScreen
└── Navigation Components       # Flow layer
    ├── RootNavigator          # App navigation
    └── AuthNavigator          # Auth flow
```

## 🎭 Theming System

### Theme Provider Architecture

```typescript
// ThemeProvider setup
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeTheme, activeThemeName } = useThemeStore();
  
  const themeContextValue = useMemo(() => ({
    theme: activeTheme,
    colorMode: activeThemeName,
    toggleTheme: useThemeStore.getState().toggleTheme,
  }), [activeTheme, activeThemeName]);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
```

### Theme Structure

```typescript
interface AppTheme {
  colors: {
    // Primary palette
    primary: string;
    primaryLight: string;
    primaryDark: string;
    
    // Secondary palette
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    
    // Semantic colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Surface colors
    background: string;
    surface: string;
    card: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textDisabled: string;
    
    // Border colors
    border: string;
    divider: string;
  };
  
  spacing: {
    xs: number;    // 4
    sm: number;    // 8
    md: number;    // 16
    lg: number;    // 24
    xl: number;    // 32
    xxl: number;   // 48
  };
  
  borderRadius: {
    small: number;   // 4
    medium: number;  // 8
    large: number;   // 16
    round: number;   // 999
  };
  
  typography: {
    h1: TextStyle;
    h2: TextStyle;
    h3: TextStyle;
    body1: TextStyle;
    body2: TextStyle;
    caption: TextStyle;
  };
  
  shadows: {
    small: ViewStyle;
    medium: ViewStyle;
    large: ViewStyle;
  };
}
```

### Theme Usage Pattern

```typescript
// Hook for accessing theme in components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Component implementation
const MyComponent: React.FC = () => {
  const { theme, colorMode } = useTheme();
  
  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.medium,
    }}>
      <Text style={[theme.typography.body1, { color: theme.colors.text }]}>
        Hello World
      </Text>
    </View>
  );
};
```

## 🧱 Base Components

### ThemedButton

**Location**: `src/components/ThemedButton.tsx`

A versatile button component with multiple variants and built-in theming.

```typescript
interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];
  
  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      hapticFeedback.light();
      onPress();
    }
  }, [disabled, loading, onPress]);

  return (
    <Pressable
      style={({ pressed }) => [
        ...buttonStyles,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.text} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text style={[styles.text, textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </Pressable>
  );
};
```

**Usage Examples:**
```typescript
// Primary button
<ThemedButton title="Add Entry" onPress={handleAdd} />

// Secondary with icon
<ThemedButton 
  title="Share" 
  variant="secondary" 
  icon={<ShareIcon />}
  onPress={handleShare} 
/>

// Loading state
<ThemedButton 
  title="Saving..." 
  loading={isLoading} 
  onPress={handleSave} 
/>
```

### ThemedInput

**Location**: `src/components/ThemedInput.tsx`

A comprehensive input component with validation support and theming.

```typescript
interface ThemedInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

const ThemedInput: React.FC<ThemedInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  autoFocus = false,
  secureTextEntry = false,
  keyboardType = 'default',
  returnKeyType = 'done',
  leftIcon,
  rightIcon,
  style,
  inputStyle,
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  const containerStyle = [
    styles.container,
    {
      borderColor: error 
        ? theme.colors.error 
        : isFocused 
          ? theme.colors.primary 
          : theme.colors.border,
    },
    disabled && styles.disabled,
    style,
  ];

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {label}
        </Text>
      )}
      
      <View style={containerStyle}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={[styles.input, inputStyle, { color: theme.colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          autoFocus={autoFocus}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      
      {error && (
        <Text style={[styles.error, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};
```

### ThemedCard

**Location**: `src/components/ThemedCard.tsx`

A flexible container component for grouping related content.

```typescript
interface ThemedCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  elevation?: 'none' | 'small' | 'medium' | 'large';
}

const ThemedCard: React.FC<ThemedCardProps> = ({
  children,
  title,
  subtitle,
  onPress,
  style,
  contentStyle,
  elevation = 'small',
}) => {
  const { theme } = useTheme();
  
  const cardStyles = [
    styles.card,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    theme.shadows[elevation],
    style,
  ];

  const CardContent = (
    <View style={cardStyles}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && (
            <Text style={[theme.typography.h3, { color: theme.colors.text }]}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
      
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable 
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {CardContent}
      </Pressable>
    );
  }

  return CardContent;
};
```

## 🔧 Feature Components

### GratitudeInputBar

**Location**: `src/components/GratitudeInputBar.tsx`

The primary input component for adding gratitude statements.

```typescript
interface GratitudeInputBarProps {
  onSubmit: (statement: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

const GratitudeInputBar: React.FC<GratitudeInputBarProps> = ({
  onSubmit,
  placeholder = "Bugün neler için minnettarsın?",
  disabled = false,
  maxLength = 200,
}) => {
  const [statement, setStatement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme } = useTheme();

  const handleSubmit = useCallback(async () => {
    if (!statement.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(statement.trim());
      setStatement('');
      hapticFeedback.success();
    } catch (error) {
      console.error('Error submitting statement:', error);
      hapticFeedback.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [statement, isSubmitting, onSubmit]);

  const isValid = statement.trim().length > 0;
  const remainingChars = maxLength - statement.length;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <ThemedInput
          value={statement}
          onChangeText={setStatement}
          placeholder={placeholder}
          multiline
          numberOfLines={2}
          maxLength={maxLength}
          disabled={disabled || isSubmitting}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
        
        <ThemedButton
          title="Ekle"
          onPress={handleSubmit}
          disabled={!isValid || disabled}
          loading={isSubmitting}
          size="small"
          style={styles.submitButton}
        />
      </View>
      
      <View style={styles.footer}>
        <Text style={[styles.charCount, { 
          color: remainingChars < 20 
            ? theme.colors.warning 
            : theme.colors.textSecondary 
        }]}>
          {remainingChars} karakter kaldı
        </Text>
      </View>
    </View>
  );
};
```

### GratitudeStatementItem

**Location**: `src/components/GratitudeStatementItem.tsx`

Component for displaying and editing individual gratitude statements.

```typescript
interface GratitudeStatementItemProps {
  statement: string;
  index: number;
  onEdit?: (index: number, newStatement: string) => void;
  onDelete?: (index: number) => void;
  editable?: boolean;
  animateIn?: boolean;
}

const GratitudeStatementItem: React.FC<GratitudeStatementItemProps> = ({
  statement,
  index,
  onEdit,
  onDelete,
  editable = true,
  animateIn = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(statement);
  const [showActions, setShowActions] = useState(false);
  const { theme } = useTheme();
  
  const animatedValue = useRef(new Animated.Value(animateIn ? 0 : 1)).current;
  const slideValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animateIn) {
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [animateIn, animatedValue]);

  const handleEdit = useCallback(() => {
    if (onEdit && editText.trim() !== statement) {
      onEdit(index, editText.trim());
      hapticFeedback.light();
    }
    setIsEditing(false);
  }, [editText, statement, index, onEdit]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'İfadeyi Sil',
      'Bu minnettarlık ifadesini silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => {
            onDelete?.(index);
            hapticFeedback.medium();
          }
        },
      ]
    );
  }, [index, onDelete]);

  const toggleActions = useCallback(() => {
    setShowActions(!showActions);
    Animated.spring(slideValue, {
      toValue: showActions ? 0 : 1,
      useNativeDriver: true,
    }).start();
  }, [showActions, slideValue]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        onLongPress={editable ? toggleActions : undefined}
        style={[styles.itemContainer, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.content}>
          <Text style={[styles.bullet, { color: theme.colors.primary }]}>
            •
          </Text>
          
          {isEditing ? (
            <ThemedInput
              value={editText}
              onChangeText={setEditText}
              onSubmitEditing={handleEdit}
              onBlur={handleEdit}
              autoFocus
              multiline
              style={styles.editInput}
            />
          ) : (
            <Text 
              style={[styles.text, { color: theme.colors.text }]}
              onPress={editable ? () => setIsEditing(true) : undefined}
            >
              {statement}
            </Text>
          )}
        </View>
        
        {editable && showActions && (
          <Animated.View
            style={[
              styles.actions,
              {
                opacity: slideValue,
                transform: [
                  {
                    translateX: slideValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ThemedButton
              title="Düzenle"
              variant="outline"
              size="small"
              onPress={() => setIsEditing(true)}
              style={styles.actionButton}
            />
            <ThemedButton
              title="Sil"
              variant="outline"
              size="small"
              onPress={handleDelete}
              style={[styles.actionButton, { borderColor: theme.colors.error }]}
              textStyle={{ color: theme.colors.error }}
            />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
};
```

### EnhancedStreakVisual

**Location**: `src/components/EnhancedStreakVisual.tsx`

Visual component for displaying streak information with animations.

```typescript
interface EnhancedStreakVisualProps {
  currentStreak: number;
  longestStreak: number;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  animateOnMount?: boolean;
}

const EnhancedStreakVisual: React.FC<EnhancedStreakVisualProps> = ({
  currentStreak,
  longestStreak,
  size = 'medium',
  showDetails = true,
  animateOnMount = true,
}) => {
  const { theme } = useTheme();
  const scaleValue = useRef(new Animated.Value(animateOnMount ? 0 : 1)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animateOnMount) {
      Animated.sequence([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animateOnMount, scaleValue, rotateValue]);

  const sizeConfig = {
    small: { radius: 30, fontSize: 16 },
    medium: { radius: 40, fontSize: 20 },
    large: { radius: 50, fontSize: 24 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const progressPercentage = Math.min(currentStreak / 30, 1); // Max 30 days circle
  const strokeDashoffset = circumference * (1 - progressPercentage);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.circleContainer,
          {
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        <Svg width={config.radius * 2.2} height={config.radius * 2.2}>
          {/* Background circle */}
          <Circle
            cx={config.radius * 1.1}
            cy={config.radius * 1.1}
            r={config.radius}
            fill="none"
            stroke={theme.colors.border}
            strokeWidth="4"
          />
          
          {/* Progress circle */}
          <AnimatedCircle
            cx={config.radius * 1.1}
            cy={config.radius * 1.1}
            r={config.radius}
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${config.radius * 1.1} ${config.radius * 1.1})`}
          />
        </Svg>
        
        <View style={styles.centerContent}>
          <Text style={[styles.streakNumber, { 
            fontSize: config.fontSize,
            color: theme.colors.primary 
          }]}>
            {currentStreak}
          </Text>
          <Text style={[styles.streakLabel, { color: theme.colors.textSecondary }]}>
            gün
          </Text>
        </View>
      </Animated.View>

      {showDetails && (
        <View style={styles.details}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Mevcut Seri
            </Text>
          </View>
          
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {longestStreak}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              En Uzun Seri
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
```

## 🎯 Component Best Practices

### 1. Performance Optimization

```typescript
// Use React.memo for pure components
const OptimizedComponent = React.memo<Props>(({ prop1, prop2 }) => {
  return <View>...</View>;
});

// Use useCallback for event handlers
const handlePress = useCallback(() => {
  onPress?.();
}, [onPress]);

// Use useMemo for expensive calculations
const computedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

### 2. Accessibility

```typescript
const AccessibleComponent: React.FC = () => (
  <Pressable
    accessible={true}
    accessibilityRole="button"
    accessibilityLabel="Add gratitude statement"
    accessibilityHint="Double tap to add a new gratitude statement"
    accessibilityState={{ disabled: isDisabled }}
  >
    <Text>Add Statement</Text>
  </Pressable>
);
```

### 3. Error Boundaries

```typescript
class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    analyticsService.logError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }

    return this.props.children;
  }
}
```

### 4. Testing Patterns

```typescript
// Component testing with React Native Testing Library
import { render, fireEvent, waitFor } from '@testing-library/react-native';

describe('ThemedButton', () => {
  it('should handle press events', async () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ThemedButton title="Test Button" onPress={onPress} />
    );
    
    fireEvent.press(getByText('Test Button'));
    
    await waitFor(() => {
      expect(onPress).toHaveBeenCalled();
    });
  });
  
  it('should be disabled when loading', () => {
    const { getByText } = render(
      <ThemedButton title="Test" onPress={jest.fn()} loading={true} />
    );
    
    expect(getByText('Test')).toBeDisabled();
  });
});
```

## 📱 Screen Components

### Component Structure Pattern

```typescript
// Screen component pattern
const EnhancedScreenName: React.FC = () => {
  // Hooks
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { data, loading, error } = useScreenData();
  
  // State
  const [localState, setLocalState] = useState(initialValue);
  
  // Effects
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  // Handlers
  const handleAction = useCallback(() => {
    // Action logic
  }, [dependencies]);
  
  // Loading state
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }
  
  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <ScrollView style={styles.content}>
        {/* Screen content */}
      </ScrollView>
      
      {/* Fixed elements */}
      <FloatingActionButton onPress={handleAction} />
    </SafeAreaView>
  );
};
```

## 🎨 Animation Patterns

### Entrance Animations

```typescript
const useEntranceAnimation = (trigger: boolean) => {
  const fadeValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    if (trigger) {
      Animated.parallel([
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideValue, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]).start();
    }
  }, [trigger]);
  
  return {
    opacity: fadeValue,
    transform: [{ translateY: slideValue }],
  };
};
```

### Gesture Animations

```typescript
const useSwipeGesture = (onSwipe: (direction: 'left' | 'right') => void) => {
  const translateX = useRef(new Animated.Value(0)).current;
  
  const panGesture = PanGestureHandler.Gesture.pan()
    .onUpdate((event) => {
      translateX.setValue(event.translationX);
    })
    .onEnd((event) => {
      const { translationX, velocityX } = event;
      
      if (Math.abs(translationX) > 100 || Math.abs(velocityX) > 500) {
        onSwipe(translationX > 0 ? 'right' : 'left');
      }
      
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    });
    
  return { panGesture, translateX };
};
```

---

This component guide provides a comprehensive overview of the UI architecture and component patterns used in the Yeser gratitude app, enabling developers to understand, maintain, and extend the user interface effectively.