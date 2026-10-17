import type { AdminRole } from '../../../auth/oidc-client';
import type { Project, ProjectComment } from '../../../marketplace/api';
import type { SectionResult } from '../../../marketplace/project-detail-model';

export type ModerationAction = 'approve' | 'reject' | 'hide' | 'restore';

export type QueueState = SectionResult<ProjectComment[]> | { kind: 'loading' };

export type CommentModerationQueueProps = {
  project: Project;
  initialPending: SectionResult<ProjectComment[]>;
  roles: readonly AdminRole[];
  onChanged: (message: string, pendingDelta: number) => void;
};

export type CommentConfirmation = {
  comment: ProjectComment;
  action: Extract<ModerationAction, 'reject' | 'hide'>;
};
