import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';

interface FloatingAddButtonProps {
  onPress: () => void;
}

const FloatingAddButton: React.FC<FloatingAddButtonProps> = React.memo(({ onPress }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('home.addButton.a11y')}
        activeOpacity={0.9}
        style={styles.button}
        onPress={onPress}
      >
        <Icon name="plus" size={26} color={theme.colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
});

FloatingAddButton.displayName = 'FloatingAddButton';

export default FloatingAddButton;

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    wrapper: {
      position: 'absolute',
      right: theme.spacing.md,
      bottom: theme.spacing.xl,
      left: 0,
      top: 0,
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
    },
    button: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
  });
