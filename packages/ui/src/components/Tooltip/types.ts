/**
 * Shared type definitions for the Alternun tooltip system.
 */

export type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left';

export interface TooltipConfig {
  /** Tooltip content text or React node */
  content: React.ReactNode;
  /** Where to position the tooltip relative to the trigger */
  placement?: TooltipPlacement;
  /** Optional delay before showing tooltip (ms) */
  delayDuration?: number;
}

export interface WalkthroughStep {
  /** Unique identifier for this step */
  id: string;
  /** Text or React node to display in the step */
  content: React.ReactNode;
  /** Element to spotlight or attach tooltip to */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target?: string | React.RefObject<any>;
  /** Optional placement hint for this step */
  placement?: TooltipPlacement;
  /** Action buttons: next, previous, skip, finish */
  showButtons?: {
    next?: boolean;
    prev?: boolean;
    skip?: boolean;
    finish?: boolean;
  };
}

export interface WalkthroughConfig {
  steps: WalkthroughStep[];
  /** Optional callback when tour completes */
  onComplete?: () => void;
  /** Optional callback when tour is skipped */
  onSkip?: () => void;
}
