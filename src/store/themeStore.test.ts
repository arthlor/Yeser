import { useThemeStore } from './themeStore';
import { lightTheme } from '../themes/lightTheme';
import { darkTheme } from '../themes/darkTheme';
import { act } from 'react-test-renderer';

// Mock the theme objects for simplicity in testing, if needed, or use actuals
// For this case, using actuals is fine as they are simple objects.

// Mock AsyncStorage (already handled by jest-setup.ts)

describe('useThemeStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useThemeStore.setState({
        activeThemeName: 'light',
        activeTheme: lightTheme,
      });
    });
  });

  it('should initialize with light theme as default', () => {
    const { activeThemeName, activeTheme } = useThemeStore.getState();
    expect(activeThemeName).toBe('light');
    expect(activeTheme.name).toBe(lightTheme.name); // Compare a property like name
    expect(activeTheme).toEqual(lightTheme);
  });

  it('setTheme action should update activeThemeName and activeTheme', () => {
    act(() => {
      useThemeStore.getState().setTheme('dark');
    });
    let state = useThemeStore.getState();
    expect(state.activeThemeName).toBe('dark');
    expect(state.activeTheme.name).toBe(darkTheme.name);
    expect(state.activeTheme).toEqual(darkTheme);

    act(() => {
      useThemeStore.getState().setTheme('light');
    });
    state = useThemeStore.getState();
    expect(state.activeThemeName).toBe('light');
    expect(state.activeTheme.name).toBe(lightTheme.name);
    expect(state.activeTheme).toEqual(lightTheme);
  });

  it('toggleTheme action should switch between light and dark themes', () => {
    // Initial state is light
    act(() => {
      useThemeStore.getState().toggleTheme(); // Toggle to dark
    });
    let state = useThemeStore.getState();
    expect(state.activeThemeName).toBe('dark');
    expect(state.activeTheme.name).toBe(darkTheme.name);

    act(() => {
      useThemeStore.getState().toggleTheme(); // Toggle back to light
    });
    state = useThemeStore.getState();
    expect(state.activeThemeName).toBe('light');
    expect(state.activeTheme.name).toBe(lightTheme.name);
  });
});
