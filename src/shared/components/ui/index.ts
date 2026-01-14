// Shared UI Components
export { default as ThemedButton } from './ThemedButton';
export { default as ThemedInput } from './ThemedInput';
export { default as ThemedCard } from './ThemedCard';
export { default as SegmentedControl } from './SegmentedControl';
export { default as DonutChart } from './DonutChart';
export { default as ThemedModal } from './ThemedModal';
export { default as ThemedList } from './ThemedList';
export { default as ThemedDivider } from './ThemedDivider';
export { default as StatementCard } from './StatementCard';

// Enhanced Phase 3 Components
export { default as LoadingSkeleton } from './LoadingSkeleton';
export {
  TextSkeleton,
  ParagraphSkeleton,
  CircularSkeleton,
  CardSkeleton,
  ButtonSkeleton,
  AvatarSkeleton,
  ListItemSkeleton,
} from './LoadingSkeleton';

export { default as ErrorState } from './ErrorState';
export {
  NetworkError,
  ServerError,
  NotFoundError,
  PermissionError,
  ValidationError,
  RetryError,
} from './ErrorState';

// ✨ NEW: Enhanced type exports for better developer experience
export type {
  ThemedCardProps,
  CardVariant,
  SpacingSize,
  BorderRadiusSize,
  DensitySize,
  ElevationLevel,
} from './ThemedCard';

export type { StatementCardProps } from './StatementCard';

// AI Features (PRO)
export { default as AICoachPrompt } from './AICoachPrompt';
export { default as AIChatModal } from './AIChatModal';
