import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../providers/ThemeProvider';
import { CENTER_ACTION_SIZE, TAB_BAR_HEIGHT } from './tabBarMetrics';

import { AppTheme } from '@/themes/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 200,
  mass: 0.8,
};

const FAB_SPRING_CONFIG = {
  damping: 16,
  stiffness: 240,
  mass: 0.6,
};

const ICON_SIZE_INACTIVE = 22;
const ICON_SIZE_ACTIVE = 23;

// ─── Icon mapping ────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  HomeTab: { active: 'home', inactive: 'home-outline' },
  DailyEntryTab: { active: 'plus', inactive: 'plus' },
  PastEntriesTab: { active: 'history', inactive: 'clock-outline' },
  CalendarTab: { active: 'calendar', inactive: 'calendar-outline' },
  SettingsTab: { active: 'cog', inactive: 'cog-outline' },
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface TabItemProps {
  route: BottomTabBarProps['state']['routes'][0];
  index: number;
  isFocused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  theme: AppTheme;
}

// ─── Animated Tab Item ───────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TabItem: React.FC<TabItemProps> = React.memo(
  ({ route, isFocused, label, onPress, onLongPress, theme }) => {
    const focusProgress = useSharedValue(isFocused ? 1 : 0);
    const pressScale = useSharedValue(1);

    useEffect(() => {
      focusProgress.value = withSpring(isFocused ? 1 : 0, SPRING_CONFIG);
    }, [isFocused, focusProgress]);

    const iconConfig = TAB_ICONS[route.name] || {
      active: 'circle',
      inactive: 'circle-outline',
    };

    const containerAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: pressScale.value }],
      };
    });

    const iconAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            scale: interpolate(focusProgress.value, [0, 1], [1, 1.04]),
          },
          {
            translateY: interpolate(focusProgress.value, [0, 1], [0, -1]),
          },
        ],
      };
    });

    const labelAnimatedStyle = useAnimatedStyle(() => {
      return {
        opacity: interpolate(focusProgress.value, [0, 0.6, 1], [0, 0, 0.86]),
        transform: [
          {
            translateY: interpolate(focusProgress.value, [0, 1], [3, 0]),
          },
          {
            scale: interpolate(focusProgress.value, [0, 0.6, 1], [0.8, 0.8, 1]),
          },
        ],
        maxHeight: interpolate(focusProgress.value, [0, 0.5, 1], [0, 0, 16]),
      };
    });

    const handlePressIn = useCallback(() => {
      pressScale.value = withSpring(0.94, FAB_SPRING_CONFIG);
    }, [pressScale]);

    const handlePressOut = useCallback(() => {
      pressScale.value = withSpring(1, SPRING_CONFIG);
    }, [pressScale]);

    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={label}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.tabItem, containerAnimatedStyle]}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        {/* Icon */}
        <Animated.View style={iconAnimatedStyle}>
          <Icon
            name={isFocused ? iconConfig.active : iconConfig.inactive}
            size={isFocused ? ICON_SIZE_ACTIVE : ICON_SIZE_INACTIVE}
            color={isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
        </Animated.View>

        {/* Label — only visible when active */}
        <Animated.Text
          style={[
            styles.tabLabel,
            {
              color: theme.colors.primary,
              fontFamily: theme.typography.fontFamilyMedium,
            },
            labelAnimatedStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      </AnimatedPressable>
    );
  }
);

TabItem.displayName = 'TabItem';

// ─── FAB Button ──────────────────────────────────────────────────────────────

interface FABButtonProps {
  onPress: () => void;
  onLongPress: () => void;
  isFocused: boolean;
  theme: AppTheme;
  accessibilityLabel: string;
}

const FABButton: React.FC<FABButtonProps> = React.memo(
  ({ onPress, onLongPress, isFocused, theme, accessibilityLabel }) => {
    const pressScale = useSharedValue(1);
    const focusProgress = useSharedValue(isFocused ? 1 : 0);
    const fabBackgroundColor = isFocused
      ? theme.colors.primary
      : (theme.colors.surfaceElevated ?? theme.colors.surface);
    const fabBorderColor = isFocused
      ? theme.colors.primary
      : (theme.colors.borderMedium ?? theme.colors.outlineVariant);

    useEffect(() => {
      focusProgress.value = withTiming(isFocused ? 1 : 0, { duration: 180 });
    }, [isFocused, focusProgress]);

    const fabAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { scale: pressScale.value },
          {
            translateY: interpolate(focusProgress.value, [0, 1], [0, -1]),
          },
        ],
      };
    });

    const iconAnimatedStyle = useAnimatedStyle(() => {
      return {
        opacity: interpolate(focusProgress.value, [0, 1], [0.86, 1]),
      };
    });

    const handlePressIn = useCallback(() => {
      pressScale.value = withSpring(0.92, FAB_SPRING_CONFIG);
    }, [pressScale]);

    const handlePressOut = useCallback(() => {
      pressScale.value = withSpring(1, {
        damping: 10,
        stiffness: 300,
        mass: 0.5,
      });
    }, [pressScale]);

    return (
      <View style={styles.fabContainer}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={isFocused ? { selected: true } : {}}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.fabButton,
            {
              shadowColor: theme.colors.primary,
              backgroundColor: fabBackgroundColor,
              borderColor: fabBorderColor,
            },
            fabAnimatedStyle,
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Animated.View style={iconAnimatedStyle}>
            <Icon
              name="plus"
              size={24}
              color={isFocused ? theme.colors.onPrimary : theme.colors.primary}
            />
          </Animated.View>
        </AnimatedPressable>
      </View>
    );
  }
);

FABButton.displayName = 'FABButton';

// ─── Custom Tab Bar ──────────────────────────────────────────────────────────

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 12);
  const isDark = theme.name === 'dark';
  const barBackgroundColor = isDark
    ? theme.colors.surface
    : (theme.colors.surfaceElevated ?? theme.colors.surface);
  const barBorderColor = theme.colors.borderLight ?? theme.colors.outlineVariant;
  const highlightColor = theme.colors.primaryContainer;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: bottomPadding,
          height: TAB_BAR_HEIGHT + bottomPadding,
        },
      ]}
    >
      <View
        style={[
          styles.background,
          {
            backgroundColor: barBackgroundColor,
            borderTopColor: barBorderColor,
            shadowColor: theme.colors.scrim,
          },
        ]}
      />

      <View
        style={[
          styles.topHighlight,
          {
            backgroundColor: highlightColor,
          },
        ]}
      />

      <View style={styles.tabsRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const isFocused = state.index === index;
          const isFAB = route.name === 'DailyEntryTab';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          if (isFAB) {
            return (
              <FABButton
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                isFocused={isFocused}
                theme={theme}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              />
            );
          }

          return (
            <TabItem
              key={route.key}
              route={route}
              index={index}
              isFocused={isFocused}
              label={label}
              onPress={onPress}
              onLongPress={onLongPress}
              theme={theme}
            />
          );
        })}
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 10,
  },

  // ── Tab Item ──────────────────────────────────────────────────
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 3,
    letterSpacing: 0.1,
  },

  // ── FAB ───────────────────────────────────────────────────────
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
    position: 'relative',
  },
  fabButton: {
    width: CENTER_ACTION_SIZE,
    height: CENTER_ACTION_SIZE,
    borderRadius: CENTER_ACTION_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default CustomTabBar;
