// Mocks must be at the top level and will be hoisted by Jest.
const mockLogScreenView = jest.fn();
const mockLogEvent = jest.fn();
const mockLogAppOpen = jest.fn();

// Mock @react-native-firebase/analytics.
// getAnalytics itself is a mock function that returns an object with our method mocks.
jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({
    logScreenView: mockLogScreenView,
    logEvent: mockLogEvent,
    logAppOpen: mockLogAppOpen,
  })),
}));

// Import getAnalytics to be able to clear its mock's call history.
import { getAnalytics } from '@react-native-firebase/analytics';

// Type for the service, will be assigned in beforeEach
let analyticsService: typeof import('./analyticsService').analyticsService;

describe('analyticsService', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // 1. Clear all mock function call histories *before* loading the service module.
    mockLogScreenView.mockClear();
    mockLogEvent.mockClear();
    mockLogAppOpen.mockClear();
    // Crucially, clear the factory mock for getAnalytics itself.
    // This ensures that when the service module is re-required and calls getAnalytics(),
    // this mock is in a pristine state for the current test.
    (getAnalytics as jest.Mock).mockClear();

    // 2. Use jest.isolateModules to ensure analyticsService.ts is loaded fresh,
    // picking up the cleared and (implicitly by jest.mock) re-provided getAnalytics mock.
    jest.isolateModules(() => {
      analyticsService = require('./analyticsService').analyticsService;
    });

    // 3. Set up console error spy for tests that check error handling.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('logScreenView', () => {
    it('should call analytics.logScreenView with correct parameters', async () => {
      const screenName = 'TestScreen';
      await analyticsService.logScreenView(screenName);
      // Verify getAnalytics was called once (when the service module was loaded by require).
      expect(getAnalytics).toHaveBeenCalledTimes(1);
      expect(mockLogScreenView).toHaveBeenCalledWith({
        screen_name: screenName,
        screen_class: screenName,
      });
      expect(mockLogScreenView).toHaveBeenCalledTimes(1);
    });

    it('should call console.error if analytics.logScreenView throws', async () => {
      const screenName = 'ErrorScreen';
      mockLogScreenView.mockRejectedValueOnce(new Error('Firebase error'));
      await analyticsService.logScreenView(screenName);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to log screen view to Firebase Analytics',
        expect.any(Error)
      );
    });
  });

  describe('logEvent', () => {
    it('should call analytics.logEvent with event name and parameters', async () => {
      const eventName = 'test_event';
      const params = { custom_param: 'value123' };
      await analyticsService.logEvent(eventName, params);
      expect(getAnalytics).toHaveBeenCalledTimes(1); // Called once on module load
      expect(mockLogEvent).toHaveBeenCalledWith(eventName, params);
      expect(mockLogEvent).toHaveBeenCalledTimes(1);
    });

    it('should call analytics.logEvent with event name and no parameters', async () => {
      const eventName = 'simple_event';
      await analyticsService.logEvent(eventName);
      expect(mockLogEvent).toHaveBeenCalledWith(eventName, undefined);
      expect(mockLogEvent).toHaveBeenCalledTimes(1);
    });

    it('should call console.error if analytics.logEvent throws', async () => {
      const eventName = 'error_event';
      mockLogEvent.mockRejectedValueOnce(new Error('Firebase event error'));
      await analyticsService.logEvent(eventName);
      expect(console.error).toHaveBeenCalledWith(
        `Failed to log event '${eventName}' to Firebase Analytics`,
        expect.any(Error)
      );
    });
  });

  describe('logAppOpen', () => {
    it('should call analytics.logAppOpen', async () => {
      await analyticsService.logAppOpen();
      expect(getAnalytics).toHaveBeenCalledTimes(1); // Called once on module load
      expect(mockLogAppOpen).toHaveBeenCalledTimes(1);
    });

    it('should call console.error if analytics.logAppOpen throws', async () => {
      mockLogAppOpen.mockRejectedValueOnce(new Error('Firebase app_open error'));
      await analyticsService.logAppOpen();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to log app_open event to Firebase Analytics',
        expect.any(Error)
      );
    });
  });
});
