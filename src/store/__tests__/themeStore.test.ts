import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { act } from '@testing-library/react-native';

import { useThemeStore } from '../themeStore';

// Mock AsyncStorage since it's used for persistence
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock theme objects
jest.mock('@/themes/lightTheme', () => ({
  lightTheme: {
    name: 'light',
    colors: { primary: '#007AFF', background: '#FFFFFF' },
    typography: { fontSize: 16 },
  },
}));

jest.mock('@/themes/darkTheme', () => ({
  darkTheme: {
    name: 'dark',
    colors: { primary: '#0A84FF', background: '#000000' },
    typography: { fontSize: 16 },
  },
}));

describe('themeStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useThemeStore.getState().setTheme('light');
    });
  });

  describe('Initial State', () => {
    it('should have light theme as default', () => {
      const state = useThemeStore.getState();

      expect(state.activeThemeName).toBe('light');
      expect(state.activeTheme.name).toBe('light');
    });

    it('should have consistent theme object for initial state', () => {
      const state = useThemeStore.getState();

      expect(state.activeTheme).toBeDefined();
      expect(state.activeTheme.colors).toBeDefined();
      expect(state.activeTheme.typography).toBeDefined();
    });
  });

  describe('Theme Setting', () => {
    it('should set light theme correctly', () => {
      act(() => {
        useThemeStore.getState().setTheme('light');
      });

      const state = useThemeStore.getState();
      expect(state.activeThemeName).toBe('light');
      expect(state.activeTheme.name).toBe('light');
    });

    it('should set dark theme correctly', () => {
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });

      const state = useThemeStore.getState();
      expect(state.activeThemeName).toBe('dark');
      expect(state.activeTheme.name).toBe('dark');
    });

    it('should update theme object when setting theme', () => {
      // Start with light theme
      act(() => {
        useThemeStore.getState().setTheme('light');
      });
      expect(useThemeStore.getState().activeTheme.colors.background).toBe('#FFFFFF');

      // Switch to dark theme
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });
      expect(useThemeStore.getState().activeTheme.colors.background).toBe('#000000');
    });
  });

  describe('Theme Toggling', () => {
    it('should toggle from light to dark', () => {
      // Start with light theme
      act(() => {
        useThemeStore.getState().setTheme('light');
      });
      expect(useThemeStore.getState().activeThemeName).toBe('light');

      // Toggle to dark
      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(useThemeStore.getState().activeThemeName).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      // Start with dark theme
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });
      expect(useThemeStore.getState().activeThemeName).toBe('dark');

      // Toggle to light
      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(useThemeStore.getState().activeThemeName).toBe('light');
    });

    it('should update theme object when toggling', () => {
      // Start with light theme
      act(() => {
        useThemeStore.getState().setTheme('light');
      });

      // Toggle and verify dark theme object
      act(() => {
        useThemeStore.getState().toggleTheme();
      });

      const state = useThemeStore.getState();
      expect(state.activeThemeName).toBe('dark');
      expect(state.activeTheme.name).toBe('dark');
      expect(state.activeTheme.colors.background).toBe('#000000');
    });

    it('should toggle multiple times correctly', () => {
      // Start with light
      act(() => {
        useThemeStore.getState().setTheme('light');
      });

      // Toggle to dark
      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(useThemeStore.getState().activeThemeName).toBe('dark');

      // Toggle back to light
      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(useThemeStore.getState().activeThemeName).toBe('light');

      // Toggle to dark again
      act(() => {
        useThemeStore.getState().toggleTheme();
      });
      expect(useThemeStore.getState().activeThemeName).toBe('dark');
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent activeTheme when setting theme', () => {
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });

      const state = useThemeStore.getState();
      expect(state.activeThemeName).toBe('dark');
      expect(state.activeTheme.name).toBe('dark');
      expect(state.activeTheme.colors.primary).toBe('#0A84FF');
    });

    it('should maintain consistent activeTheme when toggling', () => {
      // Start with light, toggle to dark
      act(() => {
        useThemeStore.getState().setTheme('light');
        useThemeStore.getState().toggleTheme();
      });

      const state = useThemeStore.getState();
      expect(state.activeThemeName).toBe('dark');
      expect(state.activeTheme.name).toBe('dark');
      expect(state.activeTheme.colors.primary).toBe('#0A84FF');
    });
  });

  describe('Action Methods', () => {
    it('should have all required action methods', () => {
      const state = useThemeStore.getState();

      expect(typeof state.setTheme).toBe('function');
      expect(typeof state.toggleTheme).toBe('function');
    });

    it('should have all required state properties', () => {
      const state = useThemeStore.getState();

      expect(state.activeThemeName).toBeDefined();
      expect(state.activeTheme).toBeDefined();
      expect(['light', 'dark']).toContain(state.activeThemeName);
    });
  });

  describe('Theme Objects', () => {
    it('should have different colors for light and dark themes', () => {
      // Test light theme
      act(() => {
        useThemeStore.getState().setTheme('light');
      });
      const lightState = useThemeStore.getState();

      // Test dark theme
      act(() => {
        useThemeStore.getState().setTheme('dark');
      });
      const darkState = useThemeStore.getState();

      // Verify themes are different
      expect(lightState.activeTheme.colors.background).not.toBe(
        darkState.activeTheme.colors.background
      );
      expect(lightState.activeTheme.colors.primary).not.toBe(darkState.activeTheme.colors.primary);
    });
  });
});
