// src/types/lottie-animations.d.ts

// Lottie animation data structure
interface LottieAnimation {
  v: string; // version
  fr: number; // frame rate
  ip: number; // in point
  op: number; // out point
  w: number; // width
  h: number; // height
  nm: string; // name
  ddd: number; // 3d
  assets: unknown[];
  layers: unknown[];
  markers?: unknown[];
  [key: string]: unknown;
}

declare module '*.lottie' {
  const value: LottieAnimation | number; // Can be animation data or asset reference
  export default value;
}

declare module '*.json' {
  const value: Record<string, unknown> | LottieAnimation;
  export default value;
} 