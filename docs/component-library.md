# Component Library

> Comprehensive guide to Yeser's reusable UI component system with usage examples and implementation patterns.

## 🎨 Overview

Yeser's component library provides:

- **Themed Components** - Automatically adapt to light/dark themes
- **Accessibility First** - WCAG 2.1 AA compliant by default
- **Performance Optimized** - Memoized and optimized for React Native
- **TypeScript Native** - Full type safety and IntelliSense support
- **Consistent API** - Uniform prop patterns across all components

## 🧱 Core UI Components

### ThemedButton

A versatile button component with multiple variants and states.

```typescript
interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

// Usage Examples
<ThemedButton
  title="Minnet Ekle"
  onPress={handleAddGratitude}
  variant="filled"
  size="medium"
  icon="plus"
  iconPosition="left"
/>

<ThemedButton
  title="Kaydet"
  onPress={handleSave}
  variant="outlined"
  loading={isSaving}
  disabled={!isValid}
  fullWidth
/>

// Implementation
const ThemedButton: React.FC<ThemedButtonProps> = React.memo(({
  title,
  onPress,
  variant = 'filled',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();

  const styles = useMemo(() =>
    createButtonStyles(theme, variant, size, disabled, fullWidth),
    [theme, variant, size, disabled, fullWidth]
  );

  const textColor = useMemo(() => {
    if (disabled) return theme.colors.onSurfaceVariant;

    switch (variant) {
      case 'filled': return theme.colors.onPrimary;
      case 'outlined': return theme.colors.primary;
      case 'text': return theme.colors.primary;
      default: return theme.colors.onPrimary;
    }
  }, [theme, variant, disabled]);

  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      hapticFeedback.light();
      onPress();
    }
  }, [disabled, loading, onPress]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading }}
      testID={`button-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Icon
              name={icon}
              size={styles.iconSize}
              color={textColor}
              style={styles.iconLeft}
            />
          )}
          <Text style={[styles.text, { color: textColor }]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon
              name={icon}
              size={styles.iconSize}
              color={textColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});
```

### ThemedCard

A flexible card container with consistent styling and elevation.

```typescript
interface ThemedCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof ThemeSpacing;
  margin?: keyof ThemeSpacing;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

// Usage Examples
<ThemedCard variant="elevated" padding="lg">
  <Text>Card content goes here</Text>
</ThemedCard>

<ThemedCard
  variant="outlined"
  onPress={() => navigate('Details')}
  accessibilityLabel="Navigate to details"
>
  <GratitudePreview entry={entry} />
</ThemedCard>

// Implementation
const ThemedCard: React.FC<ThemedCardProps> = React.memo(({
  children,
  variant = 'default',
  padding = 'md',
  margin,
  onPress,
  style,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();

  const cardStyles = useMemo(() =>
    createCardStyles(theme, variant, padding, margin),
    [theme, variant, padding, margin]
  );

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[cardStyles.container, style]}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </Component>
  );
});
```

### ThemedInput

A text input component with built-in validation and theming.

```typescript
interface ThemedInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helper?: string;
  variant?: 'outlined' | 'filled';
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: string;
  secureTextEntry?: boolean;
  disabled?: boolean;
  required?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

// Usage Examples
<ThemedInput
  label="Minnet İfadesi"
  value={gratitudeText}
  onChangeText={setGratitudeText}
  placeholder="Bugün neye minnettarsın?"
  multiline
  numberOfLines={3}
  maxLength={500}
  required
/>

<ThemedInput
  label="E-posta"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  leftIcon="email"
  error={emailError}
/>

// Implementation
const ThemedInput: React.FC<ThemedInputProps> = React.memo(({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  helper,
  variant = 'outlined',
  multiline = false,
  numberOfLines = 1,
  maxLength,
  keyboardType,
  autoCapitalize = 'sentences',
  autoComplete,
  secureTextEntry = false,
  disabled = false,
  required = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const styles = useMemo(() =>
    createInputStyles(theme, variant, isFocused, !!error, disabled),
    [theme, variant, isFocused, error, disabled]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <View style={styles.inputContainer}>
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={20}
            color={styles.iconColor}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          secureTextEntry={secureTextEntry}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label || placeholder}
          accessibilityHint={helper}
          testID={`input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            accessibilityRole="button"
          >
            <Icon name={rightIcon} size={20} color={styles.iconColor} />
          </TouchableOpacity>
        )}
      </View>

      {(error || helper) && (
        <Text style={error ? styles.error : styles.helper}>
          {error || helper}
        </Text>
      )}

      {maxLength && (
        <Text style={styles.counter}>
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
});
```

### ThemedModal

A modal component with backdrop and animation support.

```typescript
interface ThemedModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: 'center' | 'bottom' | 'fullscreen';
  animationType?: 'slide' | 'fade';
  dismissOnBackdrop?: boolean;
  showCloseButton?: boolean;
  maxWidth?: number;
}

// Usage Examples
<ThemedModal
  visible={isModalVisible}
  onClose={() => setIsModalVisible(false)}
  title="Minnet Ekle"
  variant="center"
  dismissOnBackdrop
>
  <GratitudeForm onSubmit={handleSubmit} />
</ThemedModal>

<ThemedModal
  visible={isBottomSheetVisible}
  onClose={() => setIsBottomSheetVisible(false)}
  variant="bottom"
  animationType="slide"
>
  <ActionSheet options={actionOptions} />
</ThemedModal>

// Implementation
const ThemedModal: React.FC<ThemedModalProps> = React.memo(({
  visible,
  onClose,
  title,
  children,
  variant = 'center',
  animationType = 'fade',
  dismissOnBackdrop = true,
  showCloseButton = true,
  maxWidth = 400,
}) => {
  const { theme } = useTheme();
  const { height } = useScreenSize();

  const styles = useMemo(() =>
    createModalStyles(theme, variant, maxWidth, height),
    [theme, variant, maxWidth, height]
  );

  const handleBackdropPress = useCallback(() => {
    if (dismissOnBackdrop) {
      onClose();
    }
  }, [dismissOnBackdrop, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {title && (
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                  {showCloseButton && (
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                      accessibilityRole="button"
                      accessibilityLabel="Close modal"
                    >
                      <Icon name="close" size={24} color={theme.colors.onSurface} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.content}>
                {children}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});
```

## 📝 Form Components

### StatementCard

A specialized card for displaying gratitude statements.

```typescript
interface StatementCardProps {
  statement: string;
  index: number;
  isEditing: boolean;
  onEdit: (index: number, newStatement: string) => void;
  onDelete: (index: number) => void;
  variant?: 'display' | 'edit';
}

// Usage Example
<StatementCard
  statement={entry.statements[0]}
  index={0}
  isEditing={editingIndex === 0}
  onEdit={handleEditStatement}
  onDelete={handleDeleteStatement}
  variant="edit"
/>

// Implementation
const StatementCard: React.FC<StatementCardProps> = React.memo(({
  statement,
  index,
  isEditing,
  onEdit,
  onDelete,
  variant = 'display',
}) => {
  const { theme } = useTheme();
  const [editText, setEditText] = useState(statement);

  const styles = useMemo(() =>
    createStatementCardStyles(theme, isEditing, variant),
    [theme, isEditing, variant]
  );

  const handleSave = useCallback(() => {
    if (editText.trim()) {
      onEdit(index, editText.trim());
    }
  }, [editText, index, onEdit]);

  const handleCancel = useCallback(() => {
    setEditText(statement);
    onEdit(index, statement); // Exit edit mode
  }, [statement, index, onEdit]);

  if (isEditing) {
    return (
      <ThemedCard style={styles.container}>
        <ThemedInput
          value={editText}
          onChangeText={setEditText}
          multiline
          numberOfLines={3}
          maxLength={200}
          placeholder="Minnet ifadeni yaz..."
          autoFocus
        />
        <View style={styles.actions}>
          <ThemedButton
            title="İptal"
            onPress={handleCancel}
            variant="text"
            size="small"
          />
          <ThemedButton
            title="Kaydet"
            onPress={handleSave}
            variant="filled"
            size="small"
            disabled={!editText.trim()}
          />
        </View>
      </ThemedCard>
    );
  }

  return (
    <ThemedCard style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.statement}>{statement}</Text>
        <Text style={styles.index}>#{index + 1}</Text>
      </View>

      {variant === 'edit' && (
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() => onEdit(index, statement)}
            style={styles.controlButton}
            accessibilityRole="button"
            accessibilityLabel="Edit statement"
          >
            <Icon name="edit" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(index)}
            style={styles.controlButton}
            accessibilityRole="button"
            accessibilityLabel="Delete statement"
          >
            <Icon name="delete" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      )}
    </ThemedCard>
  );
});
```

### GratitudeInputBar

A specialized input component for adding gratitude statements.

```typescript
interface GratitudeInputBarProps {
  onAdd: (statement: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

// Usage Example
<GratitudeInputBar
  onAdd={handleAddStatement}
  placeholder="Bugün neye minnettarsın?"
  maxLength={200}
  autoFocus
/>

// Implementation
const GratitudeInputBar: React.FC<GratitudeInputBarProps> = React.memo(({
  onAdd,
  placeholder = "Minnet ifadeni yaz...",
  maxLength = 200,
  disabled = false,
  autoFocus = false,
}) => {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const styles = useMemo(() =>
    createInputBarStyles(theme, disabled),
    [theme, disabled]
  );

  const handleAdd = useCallback(() => {
    const trimmedText = text.trim();
    if (trimmedText) {
      onAdd(trimmedText);
      setText('');
      inputRef.current?.focus();

      // Haptic feedback
      hapticFeedback.success();

      // Analytics
      analyticsService.logEvent('gratitude_statement_added', {
        statement_length: trimmedText.length,
        input_method: 'input_bar',
      });
    }
  }, [text, onAdd]);

  const handleSubmitEditing = useCallback(() => {
    handleAdd();
  }, [handleAdd]);

  const isValid = text.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          multiline
          numberOfLines={2}
          maxLength={maxLength}
          autoFocus={autoFocus}
          editable={!disabled}
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={false}
          returnKeyType="done"
          accessibilityLabel="Add gratitude statement"
          testID="gratitude-input"
        />

        <TouchableOpacity
          style={[styles.addButton, !isValid && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={!isValid || disabled}
          accessibilityRole="button"
          accessibilityLabel="Add statement"
          testID="add-statement-button"
        >
          <Icon
            name="plus"
            size={24}
            color={isValid ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      </View>

      {maxLength && (
        <Text style={styles.counter}>
          {text.length}/{maxLength}
        </Text>
      )}
    </View>
  );
});
```

## 📱 Layout Components

### ScreenLayout

A standardized layout wrapper for all screens.

```typescript
interface ScreenLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showBackButton?: boolean;
  headerRight?: React.ReactNode;
  scrollable?: boolean;
  safeArea?: boolean;
  padding?: keyof ThemeSpacing;
  backgroundColor?: string;
}

// Usage Examples
<ScreenLayout
  title="Günlük Minnet"
  subtitle="Bugün için minnettarlığını paylaş"
  showBackButton
  scrollable
>
  <DailyEntryContent />
</ScreenLayout>

<ScreenLayout
  title="Ayarlar"
  headerRight={<SettingsMenu />}
  safeArea
  padding="lg"
>
  <SettingsContent />
</ScreenLayout>

// Implementation
const ScreenLayout: React.FC<ScreenLayoutProps> = React.memo(({
  children,
  title,
  subtitle,
  showHeader = true,
  showBackButton = false,
  headerRight,
  scrollable = true,
  safeArea = true,
  padding = 'md',
  backgroundColor,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const styles = useMemo(() =>
    createScreenLayoutStyles(theme, safeArea, padding, backgroundColor),
    [theme, safeArea, padding, backgroundColor]
  );

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const ContentComponent = scrollable ? ScrollView : View;
  const ContainerComponent = safeArea ? SafeAreaView : View;

  return (
    <ContainerComponent style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {showBackButton && (
              <TouchableOpacity
                onPress={handleBackPress}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Icon name="arrow-left" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            )}
            <View style={styles.headerText}>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
          {headerRight && (
            <View style={styles.headerRight}>
              {headerRight}
            </View>
          )}
        </View>
      )}

      <ContentComponent
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ContentComponent>
    </ContainerComponent>
  );
});
```

### ErrorBoundary

A React error boundary component with user-friendly error display.

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

// Usage Example
<ErrorBoundary
  fallback={CustomErrorFallback}
  onError={(error, errorInfo) => {
    analyticsService.logError('component_error', error, errorInfo);
  }}
>
  <ComplexComponent />
</ErrorBoundary>

// Implementation
class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Error caught by boundary:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Track error in analytics
    analyticsService.logError('error_boundary', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error!}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{
  error: Error;
  resetError: () => void;
}> = ({ error, resetError }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
      <Icon name="alert-circle" size={64} color={theme.colors.error} />
      <Text style={[styles.errorTitle, { color: theme.colors.onBackground }]}>
        Bir şeyler ters gitti
      </Text>
      <Text style={[styles.errorMessage, { color: theme.colors.onSurfaceVariant }]}>
        Uygulama beklenmedik bir hatayla karşılaştı
      </Text>
      <ThemedButton
        title="Tekrar Dene"
        onPress={resetError}
        variant="outlined"
        style={styles.retryButton}
      />
    </View>
  );
};
```

## 🎭 Animation Components

### FadeInView

A component wrapper with fade-in animation.

```typescript
interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

// Usage Example
<FadeInView duration={500} delay={200}>
  <WelcomeMessage />
</FadeInView>

// Implementation
const FadeInView: React.FC<FadeInViewProps> = React.memo(({
  children,
  duration = 300,
  delay = 0,
  style,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [fadeAnim, duration, delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
});
```

## 📚 Component Style Factories

### Style Creation Utilities

```typescript
// Button styles factory
const createButtonStyles = (
  theme: AppTheme,
  variant: string,
  size: string,
  disabled: boolean,
  fullWidth: boolean
) => {
  const sizeConfig =
    theme.components.button.sizes[size as keyof typeof theme.components.button.sizes];
  const variantConfig =
    theme.components.button.variants[variant as keyof typeof theme.components.button.variants];

  return StyleSheet.create({
    container: {
      height: sizeConfig.height,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      borderRadius: theme.borders.radius.md,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: disabled
        ? variantConfig.disabledBackgroundColor
        : variantConfig.backgroundColor,
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: variantConfig.borderColor,
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled ? 0.6 : 1,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontSize: sizeConfig.fontSize,
      fontFamily: theme.typography.labelLarge.fontFamily,
      fontWeight: theme.typography.labelLarge.fontWeight,
    },
    iconLeft: {
      marginRight: theme.spacing.xs,
    },
    iconRight: {
      marginLeft: theme.spacing.xs,
    },
    iconSize: sizeConfig.fontSize + 4,
  });
};

// Card styles factory
const createCardStyles = (
  theme: AppTheme,
  variant: string,
  padding: keyof ThemeSpacing,
  margin?: keyof ThemeSpacing
) => {
  const cardTheme = theme.components.card;

  const variantStyles = {
    default: {
      backgroundColor: cardTheme.backgroundColor,
      borderWidth: 0,
      ...theme.shadows.sm,
    },
    elevated: {
      backgroundColor: cardTheme.backgroundColor,
      borderWidth: 0,
      ...theme.shadows.md,
    },
    outlined: {
      backgroundColor: cardTheme.backgroundColor,
      borderWidth: cardTheme.borderWidth,
      borderColor: cardTheme.borderColor,
      ...theme.shadows.none,
    },
  }[variant];

  return StyleSheet.create({
    container: {
      borderRadius: cardTheme.borderRadius,
      padding: theme.spacing[padding],
      margin: margin ? theme.spacing[margin] : 0,
      ...variantStyles,
    },
  });
};
```

This comprehensive component library provides a solid foundation for building consistent, accessible, and performant UI components throughout the Yeser application.
