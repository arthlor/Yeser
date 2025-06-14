# 09: Testing Strategy

Our testing strategy is pragmatic and focused, aiming for maximum confidence with reasonable effort. We prioritize testing critical user flows and complex logic, leveraging our architecture to make tests easy to write and maintain.

## 1. Testing Philosophy

- **Test Logic, Not Implementation Details**: We use `react-native-testing-library`, which encourages testing from a user's perspective. We test what the component _does_, not _how_ it does it.
- **Right Tool for the Job**: We use different types of tests for different purposes: unit tests for pure logic, integration tests for hooks and components, and E2E tests for critical user flows.
- **Focus on Confidence**: We write tests that give us high confidence that the application works as expected. We don't chase 100% code coverage for its own sake.

## 2. Levels of Testing

### Unit Tests

- **What**: Pure functions, utility functions, and simple hooks with no external dependencies.
- **Where**: In a `__tests__` folder alongside the file being tested (e.g., `src/utils/__tests__/dateUtils.test.ts`).
- **Tools**: Jest.
- **Example**: Testing a `formatDate` utility to ensure it handles various date inputs correctly.

### Integration Tests

This is where we focus most of our effort. Our architecture makes integration testing powerful and easy.

- **What**: Custom hooks and the components that use them.
- **Where**: In the `__tests__` folder within a feature directory.
- **Tools**: Jest, `react-native-testing-library`, and tools for mocking.
- **Key Pattern: Testing Custom Hooks**:

  1.  We use `renderHook` from `react-native-testing-library`.
  2.  We wrap the hook in a mock `QueryClientProvider` to control the TanStack Query cache.
  3.  **Crucially, we mock the API service layer (e.g., `gratitudeApi.ts`).** This isolates the hook from any network requests and allows us to simulate any backend response (success, error, loading) predictably. We use `jest.mock` for this.
  4.  We assert that the hook returns the correct data, loading states, and error states based on the mocked API response.

  ```typescript
  // Example test for a TanStack Query hook
  it('should return an error state when the API call fails', async () => {
    // 1. Mock the API to return an error
    gratitudeApi.getGratitudeDailyEntryByDate.mockRejectedValue(new Error('Network Error'));

    // 2. Render the hook
    const { result } = renderHook(() => useGratitudeEntryForDate('2024-01-01'), {
      wrapper: TestWrapper,
    });

    // 3. Wait for the async operation to settle
    await waitFor(() => expect(result.current.isError).toBe(true));

    // 4. Assert the final state
    expect(result.current.error.message).toBe('Network Error');
    expect(result.current.data).toBeUndefined();
  });
  ```

- **Key Pattern: Testing Components**:
  1.  We render the component using `render` from `react-native-testing-library`.
  2.  The component's data-fetching hooks are mocked using the same pattern as above.
  3.  We interact with the component using user-centric actions like `fireEvent.press`.
  4.  We assert that the UI updates correctly based on the mocked data and user interactions.

### End-to-End (E2E) Tests

- **What**: Critical, multi-step user flows.
- **Tools**: Maestro or Detox (to be implemented).
- **Examples**:
  - The complete magic link login flow.
  - Adding a gratitude statement and verifying that the streak count updates.
  - Navigating to the settings screen, changing the theme, and verifying the theme is applied.

## 3. The Testing Pyramid

Our strategy follows the testing pyramid model: lots of fast unit and integration tests at the base, and a few slower, more comprehensive E2E tests at the top to tie everything together. Our investment in a clean, hook-based architecture makes the large, valuable "integration tests" layer very effective.
