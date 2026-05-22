import { Platform } from 'react-native';

import { supabaseService } from '@/utils/supabaseClient';
import { config } from '@/utils/config';
import { logger } from '@/utils/debugConfig';

type PlatformKey = 'ios' | 'android';

interface MinimumVersionConfig {
  ios?: string;
  android?: string;
}

interface VersionCompatibilityResult {
  compatible: boolean;
  minVersion?: string;
}

const compareVersions = (current: string, minimum: string): number => {
  const currentParts = current.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const minimumParts = minimum.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(currentParts.length, minimumParts.length);

  for (let index = 0; index < length; index += 1) {
    const currentValue = currentParts[index] ?? 0;
    const minimumValue = minimumParts[index] ?? 0;

    if (currentValue > minimumValue) {
      return 1;
    }

    if (currentValue < minimumValue) {
      return -1;
    }
  }

  return 0;
};

const getPlatformKey = (): PlatformKey | null => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return Platform.OS;
  }

  return null;
};

export const checkVersionCompatibility = async (): Promise<VersionCompatibilityResult> => {
  const platform = getPlatformKey();
  if (!platform) {
    return { compatible: true };
  }

  try {
    await supabaseService.initializeLazy();
    const client = supabaseService.getClient();

    const { data, error } = await client
      .from('app_config')
      .select('value')
      .eq('key', 'minimum_supported_version')
      .maybeSingle();

    if (error || !data) {
      if (error) {
        logger.warn('Version compatibility check skipped after app_config error', {
          error: error.message,
        });
      }
      return { compatible: true };
    }

    const minimumVersions = data.value as MinimumVersionConfig;
    const minVersion = minimumVersions[platform];

    if (!minVersion) {
      return { compatible: true };
    }

    return {
      compatible: compareVersions(config.app.version, minVersion) >= 0,
      minVersion,
    };
  } catch (error) {
    logger.warn('Version compatibility check failed open', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { compatible: true };
  }
};
