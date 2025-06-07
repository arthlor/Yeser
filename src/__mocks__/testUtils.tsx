import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import React from 'react';

import { ThemeProvider } from '../providers/ThemeProvider';

// Create a test QueryClient with optimal settings for testing
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Previously cacheTime
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Test wrapper for component testing
interface ComponentTestWrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

const ComponentTestWrapper: React.FC<ComponentTestWrapperProps> = ({
  children,
  queryClient = createTestQueryClient(),
}) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>{children}</ThemeProvider>
  </QueryClientProvider>
);

// Custom render function for component testing
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export const renderWithProviders = (ui: React.ReactElement, options: CustomRenderOptions = {}) => {
  const { queryClient, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ComponentTestWrapper queryClient={queryClient}>{children}</ComponentTestWrapper>
  );
  Wrapper.displayName = 'TestWrapper';

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Component testing wrapper
export const createComponentWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();

  const ComponentWrapper = ({ children }: { children: React.ReactNode }) => (
    <ComponentTestWrapper queryClient={client}>{children}</ComponentTestWrapper>
  );
  ComponentWrapper.displayName = 'ComponentWrapper';

  return ComponentWrapper;
};

// Hook testing wrapper (minimal, without theme providers for isolated testing)
export const createHookWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();

  const HookWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  HookWrapper.displayName = 'HookWrapper';

  return HookWrapper;
};

// Utility to wait for queries to settle
export const waitForQueriesToSettle = async (queryClient: QueryClient) => {
  await new Promise((resolve) => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (queryClient.isFetching() === 0) {
        unsubscribe();
        resolve(undefined);
      }
    });
  });
};

// Mock navigation object for testing
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

// Mock route object for testing
export const mockRoute = {
  params: {},
  key: 'test-route',
  name: 'TestScreen' as const,
};

// Test ID helper utilities
export const testIds = {
  button: (variant?: string) => `themed-button${variant ? `-${variant}` : ''}`,
  input: (name?: string) => `themed-input${name ? `-${name}` : ''}`,
  card: (type?: string) => `themed-card${type ? `-${type}` : ''}`,
  text: (type?: string) => `themed-text${type ? `-${type}` : ''}`,
  icon: (name?: string) => `icon${name ? `-${name}` : ''}`,
  modal: (name?: string) => `modal${name ? `-${name}` : ''}`,
  list: (name?: string) => `list${name ? `-${name}` : ''}`,
};

// Accessibility testing helpers
export const accessibilityHelpers = {
  expectAccessible: (element: ReactTestInstance) => {
    expect(element).toBeTruthy();
  },
  expectButtonAccessible: (element: ReactTestInstance, _label: string) => {
    expect(element).toBeTruthy();
    expect(element.props.accessibilityRole).toBe('button');
    expect(element.props.accessibilityLabel || element.props.children).toBeTruthy();
  },
  expectDisabledButton: (element: ReactTestInstance) => {
    expect(element).toBeTruthy();
    expect(element.props.disabled).toBe(true);
  },
};

// Common test data for components
export const testData = {
  buttonText: 'Test Button',
  inputText: 'Test Input',
  placeholder: 'Enter text here',
  cardTitle: 'Test Card',
  cardContent: 'This is test content for the card component.',
};

// Re-export everything from testing library
export * from '@testing-library/react-native';
