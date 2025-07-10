import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './debugConfig';

const LAST_SYNCED_TOKEN_KEY = 'last_synced_push_token';

export const storeLastSyncedPushToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_SYNCED_TOKEN_KEY, token);
  } catch (error) {
    logger.error('Failed to store last synced push token in AsyncStorage', { error });
  }
};

export const getLastSyncedPushToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LAST_SYNCED_TOKEN_KEY);
  } catch (error) {
    logger.error('Failed to get last synced push token from AsyncStorage', { error });
    return null;
  }
};
