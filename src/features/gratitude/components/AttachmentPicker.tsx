import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

import { ATTACHMENT_LIMITS } from '@/features/gratitude/mediaApi';
import { logger } from '@/utils/debugConfig';
import i18n from '@/i18n';

const tr = (key: string, fallback: string, options?: Record<string, unknown>): string =>
  i18n.isInitialized ? (i18n.t(key, { defaultValue: fallback, ...options }) as string) : fallback;

export interface PickedImage {
  uri: string;
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
}

const MIME_FROM_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heic',
};

const mimeFromUri = (uri: string, fallback = 'image/jpeg'): string => {
  const ext = uri.split('.').pop()?.toLowerCase() ?? '';
  return MIME_FROM_EXT[ext] ?? fallback;
};

const toPickedImage = (asset: ImagePicker.ImagePickerAsset | undefined): PickedImage | null => {
  if (!asset?.uri) {
    return null;
  }
  const mimeType = asset.mimeType || mimeFromUri(asset.uri);
  const bytes = asset.fileSize ?? 0;
  return {
    uri: asset.uri,
    mimeType,
    bytes,
    width: asset.width,
    height: asset.height,
  };
};

const baseOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: Platform.OS === 'ios',
  quality: 0.8,
  exif: false,
  base64: false,
};

export const pickImageFromLibrary = async (): Promise<PickedImage | null> => {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        tr('gratitude.input.attach.permissionRequired.title', 'Permission required'),
        tr(
          'gratitude.input.attach.permissionRequired.photos',
          'Photo library access is needed to attach a picture.'
        )
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync(baseOptions);
    if (result.canceled) {
      return null;
    }
    const picked = toPickedImage(result.assets?.[0]);
    if (!picked) {
      return null;
    }
    if (picked.bytes && picked.bytes > ATTACHMENT_LIMITS.image.maxBytes) {
      const maxMb = ATTACHMENT_LIMITS.image.maxBytes / 1024 / 1024;
      Alert.alert(
        tr('gratitude.input.attach.imageTooLarge.title', 'Image too large'),
        tr(
          'gratitude.input.attach.imageTooLarge.message',
          'Please pick an image smaller than {{max}} MB.',
          { max: maxMb }
        )
      );
      return null;
    }
    return picked;
  } catch (err) {
    logger.error('pickImageFromLibrary failed', err as Error);
    return null;
  }
};

export const captureImageFromCamera = async (): Promise<PickedImage | null> => {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        tr('gratitude.input.attach.permissionRequired.title', 'Permission required'),
        tr(
          'gratitude.input.attach.permissionRequired.camera',
          'Camera access is needed to take a photo.'
        )
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      ...baseOptions,
      cameraType: ImagePicker.CameraType.back,
    });
    if (result.canceled) {
      return null;
    }
    const picked = toPickedImage(result.assets?.[0]);
    if (!picked) {
      return null;
    }
    if (picked.bytes && picked.bytes > ATTACHMENT_LIMITS.image.maxBytes) {
      const maxMb = ATTACHMENT_LIMITS.image.maxBytes / 1024 / 1024;
      Alert.alert(
        tr('gratitude.input.attach.imageTooLarge.title', 'Image too large'),
        tr(
          'gratitude.input.attach.imageTooLarge.message',
          'Please pick an image smaller than {{max}} MB.',
          { max: maxMb }
        )
      );
      return null;
    }
    return picked;
  } catch (err) {
    logger.error('captureImageFromCamera failed', err as Error);
    return null;
  }
};
