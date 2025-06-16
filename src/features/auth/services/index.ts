/**
 * Auth Services Index
 *
 * Exports all authentication-related services
 */

export { AuthCoordinator, authCoordinator } from './authCoordinator';
export { DeepLinkService, deepLinkService } from './deepLinkService';
export { MagicLinkService, magicLinkService } from './magicLinkService';
export {
  ExpoGoogleOAuthService as GoogleOAuthService,
  expoGoogleOAuthService as googleOAuthService,
} from './expoGoogleOAuthService';
export type { GoogleOAuthResult } from './expoGoogleOAuthService';
