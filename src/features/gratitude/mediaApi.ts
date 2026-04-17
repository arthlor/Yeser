import * as FileSystem from 'expo-file-system';
import { decode as base64Decode } from 'base64-arraybuffer';

import { getAuthedClient } from '@/services/session';
import { handleAPIError } from '@/utils/apiHelpers';
import { logger } from '@/utils/debugConfig';
import type { Attachment } from '@/schemas/gratitudeEntrySchema';
import i18n from '@/i18n';

export const GRATITUDE_MEDIA_BUCKET = 'gratitude-media';

/**
 * Per-day cap enforced both client-side (for UX) and server-side
 * (in `public.attach_media_to_statement`, which is the source of truth).
 */
export const MAX_ATTACHMENTS_PER_DAY_PER_KIND = 10;

export const ATTACHMENT_LIMITS = {
  image: { maxBytes: 8 * 1024 * 1024, maxDimension: 1600 },
  audio: { maxBytes: 4 * 1024 * 1024, maxDurationMs: 60_000 },
} as const;

export type AttachmentKind = 'image' | 'audio';

interface UploadResult {
  attachmentId: string;
  storagePath: string;
}

interface ImageUploadInput {
  uri: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  entryDate: string;
  statementIndex: number;
}

interface AudioUploadInput {
  uri: string;
  mimeType?: string;
  bytes?: number;
  durationMs?: number;
  entryDate: string;
  statementIndex: number;
}

const signedUrlCache = new Map<string, { url: string; expiresAtMs: number }>();

const inferExtension = (mime: string): string => {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/jpeg':
      return 'jpg';
    case 'audio/m4a':
    case 'audio/mp4':
    case 'audio/aac':
      return 'm4a';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/webm':
      return 'webm';
    case 'audio/wav':
      return 'wav';
    default:
      return 'bin';
  }
};

const readAsArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  return base64Decode(base64);
};

const fileSizeFromUri = async (uri: string): Promise<number> => {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    if (info.exists && 'size' in info && typeof info.size === 'number') {
      return info.size;
    }
  } catch (e) {
    logger.debug('fileSizeFromUri failed', { error: (e as Error).message });
  }
  return 0;
};

const buildStoragePath = (
  userId: string,
  entryDate: string,
  attachmentId: string,
  extension: string
) => `${userId}/${entryDate}/${attachmentId}.${extension}`;

const uploadBlob = async (path: string, data: ArrayBuffer, contentType: string): Promise<void> => {
  const { client } = await getAuthedClient();
  const { error } = await client.storage
    .from(GRATITUDE_MEDIA_BUCKET)
    .upload(path, data, { contentType, upsert: false });

  if (error) {
    throw handleAPIError(new Error(error.message), 'upload gratitude media');
  }
};

const attachOnServer = async (params: {
  entryDate: string;
  statementIndex: number;
  kind: AttachmentKind;
  storagePath: string;
  mimeType: string;
  bytes: number;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
}): Promise<string> => {
  const { client } = await getAuthedClient();
  const { data, error } = await client.rpc('attach_media_to_statement', {
    p_entry_date: params.entryDate,
    p_statement_index: params.statementIndex,
    p_kind: params.kind,
    p_storage_path: params.storagePath,
    p_mime_type: params.mimeType,
    p_bytes: params.bytes,
    p_duration_ms: params.durationMs ?? undefined,
    p_width: params.width ?? undefined,
    p_height: params.height ?? undefined,
  });

  if (error) {
    // Recognise the structured cap error emitted by the RPC and surface a
    // human-friendly message so the UI can tell the user why it was blocked.
    const match =
      typeof error.message === 'string'
        ? error.message.match(/ATTACHMENT_DAILY_LIMIT_REACHED:(image|audio):(\d+)/)
        : null;
    if (match) {
      const kind = match[1] as AttachmentKind;
      const cap = Number(match[2]) || MAX_ATTACHMENTS_PER_DAY_PER_KIND;
      const i18nKey =
        kind === 'image'
          ? 'gratitude.attachments.errors.dailyLimitImage'
          : 'gratitude.attachments.errors.dailyLimitAudio';
      const fallback =
        kind === 'image'
          ? "You have reached today's image limit ({{cap}}/day). Try again tomorrow."
          : "You have reached today's voice note limit ({{cap}}/day). Try again tomorrow.";
      const message = i18n.isInitialized
        ? (i18n.t(i18nKey, { cap, defaultValue: fallback }) as string)
        : fallback.replace('{{cap}}', String(cap));
      const friendly = new Error(message);
      (friendly as Error & { code?: string }).code = 'ATTACHMENT_DAILY_LIMIT_REACHED';
      throw friendly;
    }
    throw handleAPIError(new Error(error.message), 'attach media to statement');
  }

  if (!data || typeof data !== 'string') {
    throw new Error('attach_media_to_statement did not return an id');
  }
  return data;
};

const removeStorageObjects = async (paths: string[]): Promise<void> => {
  if (paths.length === 0) {
    return;
  }
  const { client } = await getAuthedClient();
  const { error } = await client.storage.from(GRATITUDE_MEDIA_BUCKET).remove(paths);
  if (error) {
    // Non-fatal: the RPC has already removed the row; surface but don't throw.
    logger.error('removeStorageObjects failed', {
      paths,
      error: error.message,
    });
  }
};

export const uploadImageAttachment = async (input: ImageUploadInput): Promise<UploadResult> => {
  try {
    const { session } = await getAuthedClient();
    const userId = session.user.id;

    const mime = input.mimeType ?? 'image/jpeg';
    const ext = inferExtension(mime);
    const bytes = input.bytes ?? (await fileSizeFromUri(input.uri));

    if (bytes > ATTACHMENT_LIMITS.image.maxBytes) {
      throw new Error(`Image too large (max ${ATTACHMENT_LIMITS.image.maxBytes / 1024 / 1024} MB)`);
    }

    // Crypto-random id the server does NOT generate; this keeps storage path
    // deterministic and unique before we know the db row id.
    const attachmentId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = buildStoragePath(userId, input.entryDate, attachmentId, ext);

    const buffer = await readAsArrayBuffer(input.uri);
    await uploadBlob(storagePath, buffer, mime);

    const id = await attachOnServer({
      entryDate: input.entryDate,
      statementIndex: input.statementIndex,
      kind: 'image',
      storagePath,
      mimeType: mime,
      bytes,
      width: input.width ?? null,
      height: input.height ?? null,
    });

    return { attachmentId: id, storagePath };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('uploadImageAttachment failed', error);
    throw handleAPIError(error, 'upload image attachment');
  }
};

export const uploadAudioAttachment = async (input: AudioUploadInput): Promise<UploadResult> => {
  try {
    const { session } = await getAuthedClient();
    const userId = session.user.id;

    const mime = input.mimeType ?? 'audio/m4a';
    const ext = inferExtension(mime);
    const bytes = input.bytes ?? (await fileSizeFromUri(input.uri));

    if (bytes > ATTACHMENT_LIMITS.audio.maxBytes) {
      throw new Error(
        `Recording too large (max ${ATTACHMENT_LIMITS.audio.maxBytes / 1024 / 1024} MB)`
      );
    }
    if (
      typeof input.durationMs === 'number' &&
      input.durationMs > ATTACHMENT_LIMITS.audio.maxDurationMs
    ) {
      throw new Error(`Recording too long (max ${ATTACHMENT_LIMITS.audio.maxDurationMs / 1000}s)`);
    }

    const attachmentId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = buildStoragePath(userId, input.entryDate, attachmentId, ext);

    const buffer = await readAsArrayBuffer(input.uri);
    await uploadBlob(storagePath, buffer, mime);

    const id = await attachOnServer({
      entryDate: input.entryDate,
      statementIndex: input.statementIndex,
      kind: 'audio',
      storagePath,
      mimeType: mime,
      bytes,
      durationMs: input.durationMs ?? null,
    });

    return { attachmentId: id, storagePath };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('uploadAudioAttachment failed', error);
    throw handleAPIError(error, 'upload audio attachment');
  }
};

export const deleteAttachment = async (attachmentId: string): Promise<void> => {
  try {
    const { client } = await getAuthedClient();
    const { data, error } = await client.rpc('delete_attachment', {
      p_attachment_id: attachmentId,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'delete attachment');
    }

    if (typeof data === 'string' && data.length > 0) {
      await removeStorageObjects([data]);
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('deleteAttachment failed', error);
    throw handleAPIError(error, 'delete attachment');
  }
};

export const listAttachmentsForDate = async (entryDate: string): Promise<Attachment[]> => {
  try {
    const { client } = await getAuthedClient();
    const { data, error } = await client.rpc('list_attachments_for_date', {
      p_entry_date: entryDate,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'list attachments for date');
    }

    return (data ?? []) as Attachment[];
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'list attachments for date');
  }
};

/**
 * Resolve a private-bucket object to a short-lived signed URL.
 * Mirrors the pattern used by `avatarApi.ts`.
 */
export const createAttachmentSignedUrl = async (
  storagePath: string | null | undefined,
  options: { expiresInSeconds?: number; size?: number } = {}
): Promise<string | null> => {
  if (!storagePath) {
    return null;
  }
  const expiresInSeconds = options.expiresInSeconds ?? 60 * 60 * 6; // 6h
  const cacheKey = `${storagePath}|${options.size ?? 0}`;
  const cached = signedUrlCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAtMs > now) {
    return cached.url;
  }

  try {
    const { client } = await getAuthedClient();
    const transform =
      options.size !== undefined
        ? {
            transform: {
              width: Math.max(16, Math.min(2048, Math.floor(options.size))),
              height: Math.max(16, Math.min(2048, Math.floor(options.size))),
              resize: 'cover' as const,
              quality: 80,
            },
          }
        : undefined;

    const { data, error } = await client.storage
      .from(GRATITUDE_MEDIA_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds, transform);

    if (error) {
      throw handleAPIError(new Error(error.message), 'create attachment signed url');
    }

    const url = data?.signedUrl ?? null;
    if (url) {
      // Cache for slightly less than the URL's actual expiry
      signedUrlCache.set(cacheKey, {
        url,
        expiresAtMs: now + Math.min(expiresInSeconds - 60, 60 * 60) * 1000,
      });
    }
    return url;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('createAttachmentSignedUrl failed', error);
    return null;
  }
};

export const clearAttachmentUrlCache = (storagePath?: string): void => {
  if (!storagePath) {
    signedUrlCache.clear();
    return;
  }
  for (const key of signedUrlCache.keys()) {
    if (key.startsWith(`${storagePath}|`)) {
      signedUrlCache.delete(key);
    }
  }
};
