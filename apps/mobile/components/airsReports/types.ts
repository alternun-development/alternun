import type { DetailPalette, Translate } from '../marketplace/types';
import type { AirsReviewClient, AirsReviewDetail, AirsReviewItem } from '../../utils/airsReports';

export interface AirsReviewViewProps {
  client: AirsReviewClient;
  palette: DetailPalette;
  t: Translate;
  onBack: () => void;
  /** Report linked from a review email (?report=<id>): shown first and highlighted. */
  focusId?: string;
  /** Turns the downloaded supporting file into a URL the viewer can show; replaceable in tests. */
  toLocalUrl?: (file: Blob) => Promise<string>;
}

export type AirsReviewState = 'loading' | 'ready' | 'denied' | 'error';

export type AirsReviewDetailState =
  | { status: 'loading' }
  | { status: 'ready'; data: AirsReviewDetail }
  | { status: 'error' };

export interface AirsReviewCardProps {
  item: AirsReviewItem;
  client: AirsReviewClient;
  palette: DetailPalette;
  t: Translate;
  focused: boolean;
  /** Another decision is being sent: the buttons wait. */
  busy: boolean;
  onApprove: (item: AirsReviewItem, snapshotHash: string) => Promise<boolean>;
  onReject: (item: AirsReviewItem, reason: string) => Promise<boolean>;
  onViewProof: (item: AirsReviewItem) => void;
}
