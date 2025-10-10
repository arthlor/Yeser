import * as FileSystem from 'expo-file-system';
import { decode as base64Decode } from 'base64-arraybuffer';

import { supabase } from '@/utils/supabaseClient';
import { handleAPIError } from '@/utils/apiHelpers';
import { logger } from '@/utils/debugConfig';
import { updateProfile } from '@/api/profileApi';

const AVATAR_BUCKET = 'avatars';

// In-memory cache for sized signed URLs to avoid repeated signed URL requests
// Key format: `${path}|${size}`; value stores the URL and a soft expiration timestamp
const sizedUrlCache: Map<string, { url: string; expiresAtMs: number }> = new Map();

interface UploadResult {
  path: string;
}

const getUserId = async (): Promise<string> => {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error || !sessionData.session?.user?.id) {
    throw new Error('No active session');
  }
  return sessionData.session.user.id;
};

const guessContentType = (fileUri: string): string => {
  const lower = fileUri.toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
};

const extFromType = (contentType: string): string => {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    default:
      return 'jpg';
  }
};

export const uploadAvatarFromUri = async (fileUri: string): Promise<UploadResult> => {
  try {
    const userId = await getUserId();
    const contentType = guessContentType(fileUri);
    const ext = extFromType(contentType);
    const fileBase64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
    const arrayBuffer = base64Decode(fileBase64);

    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, arrayBuffer, { contentType, upsert: false });

    if (uploadError) {
      throw handleAPIError(new Error(uploadError.message), 'upload avatar');
    }

    await updateProfile({ avatar_path: path });
    return { path };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('uploadAvatarFromUri failed', error);
    throw handleAPIError(error, 'upload avatar');
  }
};

export const deleteAvatarAtPath = async (avatarPath: string | null | undefined): Promise<void> => {
  try {
    if (!avatarPath) {
      // Still clear the profile field if missing
      await updateProfile({ avatar_path: null });
      return;
    }

    const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);

    if (removeError) {
      throw handleAPIError(new Error(removeError.message), 'delete avatar');
    }

    await updateProfile({ avatar_path: null });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('deleteAvatarAtPath failed', error);
    throw handleAPIError(error, 'delete avatar');
  }
};

export const createAvatarSignedUrl = async (
  avatarPath: string | null | undefined,
  expiresInSeconds: number = 60 * 60 * 24 * 7 // 7 days
): Promise<string | null> => {
  try {
    if (!avatarPath) {
      return null;
    }

    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(avatarPath, expiresInSeconds);

    if (error) {
      throw handleAPIError(new Error(error.message), 'create signed url');
    }

    return data?.signedUrl ?? null;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('createAvatarSignedUrl failed', error);
    throw handleAPIError(error, 'create signed url');
  }
};

/**
 * Returns a sized, transformed signed URL for the avatar using Supabase Image Transformations.
 * Caches the result in-memory to improve perceived performance.
 */
export const createAvatarSignedUrlSized = async (
  avatarPath: string | null | undefined,
  size: number,
  expiresInSeconds: number = 60 * 60 * 24 * 7 // 7 days
): Promise<string | null> => {
  try {
    if (!avatarPath) {
      return null;
    }

    const safeSize = Math.max(16, Math.min(1024, Math.floor(size)));
    const cacheKey = `${avatarPath}|${safeSize}`;

    const cached = sizedUrlCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAtMs > now) {
      return cached.url;
    }

    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(avatarPath, expiresInSeconds, {
        transform: {
          width: safeSize,
          height: safeSize,
          resize: 'cover',
          quality: 80,
        },
      });

    if (error) {
      throw handleAPIError(new Error(error.message), 'create sized signed url');
    }

    const url = data?.signedUrl ?? null;
    if (url) {
      // Soft cache TTL: 6 hours (shorter than the actual signed URL expiration)
      const sixHoursMs = 6 * 60 * 60 * 1000;
      sizedUrlCache.set(cacheKey, { url, expiresAtMs: now + sixHoursMs });
    }
    return url;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('createAvatarSignedUrlSized failed', error);
    throw handleAPIError(error, 'create sized signed url');
  }
};

export const clearAvatarSignedUrlSizedCacheForPath = (
  avatarPath: string | null | undefined
): void => {
  if (!avatarPath) {
    return;
  }
  const prefix = `${avatarPath}|`;
  for (const key of sizedUrlCache.keys()) {
    if (key.startsWith(prefix)) {
      sizedUrlCache.delete(key);
    }
  }
};
