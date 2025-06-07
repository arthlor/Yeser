import React from 'react';
import { createComponentWrapper, testData } from '@/__mocks__/testUtils';
import { fireEvent, render } from '@testing-library/react-native';

import ThemedButton from '@/shared/components/ui/ThemedButton';

// Mock the theme store
const mockTheme = {
  colors: {
    primary: '#007AFF',
    secondary: '#34C759',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    error: '#FF3B30',
    onError: '#FFFFFF',
    border: '#C7C7CC',
    textSecondary: '#8E8E93',
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
  borderRadius: {
    medium: 8,
  },
  typography: {
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    fontFamilyRegular: 'System',
  },
};

jest.mock('@/store/themeStore', () => ({
  useThemeStore: () => ({
    activeTheme: mockTheme,
    activeThemeName: 'light',
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  }),
}));

describe('ThemedButton', () => {
  const defaultProps = {
    title: testData.buttonText,
  };

  const renderButton = (props = {}) =>
    render(<ThemedButton {...defaultProps} {...props} />, {
      wrapper: createComponentWrapper(),
    });

  describe('Rendering', () => {
    it('should render with default props', () => {
      const { getByText } = renderButton();

      expect(getByText(testData.buttonText)).toBeTruthy();
    });

    it('should render with custom title', () => {
      const customTitle = 'Custom Button Title';
      const { getByText } = renderButton({ title: customTitle });

      expect(getByText(customTitle)).toBeTruthy();
    });

    it('should not render title when loading', () => {
      const { queryByText, getByTestId } = renderButton({
        isLoading: true,
        testID: 'test-button',
      });

      expect(queryByText(testData.buttonText)).toBeNull();
      expect(getByTestId('test-button')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('should render primary variant by default', () => {
      const { getByTestId } = renderButton({ testID: 'primary-button' });
      const button = getByTestId('primary-button');

      expect(button).toBeTruthy();
      expect(button.props.style.backgroundColor).toBe(mockTheme.colors.primary);
    });

    it('should render secondary variant', () => {
      const { getByTestId } = renderButton({
        variant: 'secondary',
        testID: 'secondary-button',
      });
      const button = getByTestId('secondary-button');

      expect(button.props.style.backgroundColor).toBe(mockTheme.colors.secondary);
    });

    it('should render outline variant', () => {
      const { getByTestId } = renderButton({
        variant: 'outline',
        testID: 'outline-button',
      });
      const button = getByTestId('outline-button');

      expect(button.props.style.backgroundColor).toBe('transparent');
      expect(button.props.style.borderColor).toBe(mockTheme.colors.primary);
      expect(button.props.style.borderWidth).toBe(1);
    });

    it('should render ghost variant', () => {
      const { getByTestId } = renderButton({
        variant: 'ghost',
        testID: 'ghost-button',
      });
      const button = getByTestId('ghost-button');

      expect(button.props.style.backgroundColor).toBe('transparent');
    });

    it('should render danger variant', () => {
      const { getByTestId } = renderButton({
        variant: 'danger',
        testID: 'danger-button',
      });
      const button = getByTestId('danger-button');

      expect(button.props.style.backgroundColor).toBe(mockTheme.colors.error);
    });
  });

  describe('Loading State', () => {
    it('should show activity indicator when loading', () => {
      const { getByTestId } = renderButton({
        isLoading: true,
        testID: 'loading-button',
      });

      const button = getByTestId('loading-button');
      expect(button).toBeTruthy();

      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should not show title text when loading', () => {
      const { queryByText } = renderButton({ isLoading: true });

      expect(queryByText(testData.buttonText)).toBeNull();
    });

    it('should disable button when loading', () => {
      const { getByTestId } = renderButton({
        isLoading: true,
        testID: 'loading-button',
      });
      const button = getByTestId('loading-button');

      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      const { getByTestId } = renderButton({
        disabled: true,
        testID: 'disabled-button',
      });
      const button = getByTestId('disabled-button');

      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should apply disabled styling', () => {
      const { getByTestId } = renderButton({
        disabled: true,
        testID: 'disabled-button',
      });
      const button = getByTestId('disabled-button');

      expect(button.props.style.backgroundColor).toBe(mockTheme.colors.border);
    });

    it('should not call onPress when disabled', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = renderButton({
        disabled: true,
        onPress: mockOnPress,
        testID: 'disabled-button',
      });

      fireEvent.press(getByTestId('disabled-button'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = renderButton({
        onPress: mockOnPress,
        testID: 'interactive-button',
      });

      fireEvent.press(getByTestId('interactive-button'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when loading', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = renderButton({
        isLoading: true,
        onPress: mockOnPress,
        testID: 'loading-button',
      });

      fireEvent.press(getByTestId('loading-button'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should pass through additional TouchableOpacity props', () => {
      const { getByTestId } = renderButton({
        testID: 'custom-button',
        accessibilityLabel: 'Custom accessibility label',
      });
      const button = getByTestId('custom-button');

      expect(button.props.accessibilityLabel).toBe('Custom accessibility label');
    });
  });

  describe('Styling', () => {
    it('should apply custom styles', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = renderButton({
        style: customStyle,
        testID: 'styled-button',
      });
      const button = getByTestId('styled-button');

      expect(button.props.style.marginTop).toBe(20);
    });

    it('should use theme spacing and typography', () => {
      const { getByTestId } = renderButton({ testID: 'themed-button' });
      const button = getByTestId('themed-button');

      expect(button.props.style.paddingVertical).toBe(mockTheme.spacing.medium);
      expect(button.props.style.paddingHorizontal).toBe(mockTheme.spacing.large);
      expect(button.props.style.borderRadius).toBe(mockTheme.borderRadius.medium);
    });
  });

  describe('Text Styling', () => {
    it('should apply correct text color for variants', () => {
      const { getByText } = renderButton({ variant: 'primary' });
      const text = getByText(testData.buttonText);

      expect(text.props.style.color).toBe(mockTheme.colors.onPrimary);
    });

    it('should apply theme typography', () => {
      const { getByText } = renderButton();
      const text = getByText(testData.buttonText);

      expect(text.props.style.fontSize).toBe(mockTheme.typography.button.fontSize);
      expect(text.props.style.fontWeight).toBe(mockTheme.typography.button.fontWeight);
    });
  });

  describe('Accessibility', () => {
    it('should have button accessibility role by default', () => {
      const { getByTestId } = renderButton({
        testID: 'accessible-button',
        accessibilityRole: 'button',
      });
      const button = getByTestId('accessible-button');

      expect(button.props.accessibilityRole).toBe('button');
    });

    it('should be accessible when disabled', () => {
      const { getByTestId } = renderButton({
        disabled: true,
        testID: 'disabled-accessible-button',
      });
      const button = getByTestId('disabled-accessible-button');

      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should support custom accessibility properties', () => {
      const { getByTestId } = renderButton({
        testID: 'custom-a11y-button',
        accessibilityLabel: 'Custom button label',
        accessibilityHint: 'Performs a custom action',
      });
      const button = getByTestId('custom-a11y-button');

      expect(button.props.accessibilityLabel).toBe('Custom button label');
      expect(button.props.accessibilityHint).toBe('Performs a custom action');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title gracefully', () => {
      const { getByTestId } = renderButton({ title: '', testID: 'empty-title-button' });

      expect(getByTestId('empty-title-button')).toBeTruthy();
    });

    it('should handle both disabled and loading states', () => {
      const { getByTestId } = renderButton({
        disabled: true,
        isLoading: true,
        testID: 'dual-state-button',
      });
      const button = getByTestId('dual-state-button');

      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should maintain button structure with all variants', () => {
      const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const;

      variants.forEach((variant) => {
        const { getByTestId } = renderButton({
          variant,
          testID: `${variant}-structure-test`,
        });
        const button = getByTestId(`${variant}-structure-test`);

        expect(button).toBeTruthy();
        expect(button.props.style).toBeTruthy();
        expect(button.props.style.backgroundColor).toBeDefined();
      });
    });
  });
});
