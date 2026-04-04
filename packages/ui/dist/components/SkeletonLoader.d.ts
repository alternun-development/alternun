import React from 'react';
import { type ViewStyle } from 'react-native';
interface SkeletonLoaderProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}
/**
 * Single shimmer skeleton block. Pulses between base and highlight colors
 * using the active theme's skeleton tokens — no external deps required.
 */
export declare function SkeletonLoader({
  width,
  height,
  borderRadius,
  style,
}: SkeletonLoaderProps): React.JSX.Element;
/** Full skeleton for a StatCard (matches StatCard dimensions) */
export declare function StatCardSkeleton(): React.JSX.Element;
/** Full skeleton for an AIRS ledger entry row */
export declare function LedgerRowSkeleton(): React.JSX.Element;
/** Full skeleton for a section header */
export declare function SectionHeaderSkeleton(): React.JSX.Element;
/** Skeleton for a pill/badge row (filter pills) */
export declare function PillRowSkeleton({ count }: { count?: number }): React.JSX.Element;
export {};
