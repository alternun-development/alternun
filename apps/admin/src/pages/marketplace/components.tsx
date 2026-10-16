import type { ReactNode } from 'react';
import { marketplaceCopy, marketplaceErrorMessage } from '../../marketplace/copy';
import type {
  ActivityCompletion,
  CommentStatus,
  EnterpriseStatus,
  ProjectParticipant,
  ProjectStatus,
} from '../../marketplace/api';

const commentStatusStyle: Record<CommentStatus, ProjectStatus> = {
  pending: 'draft',
  visible: 'published',
  hidden: 'paused',
  rejected: 'archived',
};

export function StatusPill({
  status,
}: {
  status:
    | ProjectStatus
    | EnterpriseStatus
    | CommentStatus
    | ProjectParticipant['status']
    | ActivityCompletion['status'];
}): JSX.Element {
  const styleStatus =
    status in commentStatusStyle ? commentStatusStyle[status as CommentStatus] : status;
  return (
    <span className={`status-pill marketplace-status marketplace-status-${styleStatus}`}>
      {marketplaceCopy.status[status]}
    </span>
  );
}

export function LoadingPanel(): JSX.Element {
  return (
    <section className='panel marketplace-placeholder' aria-live='polite'>
      <span className='marketplace-skeleton' aria-hidden='true' />
      <span>{marketplaceCopy.common.loading}</span>
    </section>
  );
}

export function ErrorPanel({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}): JSX.Element {
  return (
    <section className='panel' role='alert'>
      <p className='error-text'>{marketplaceErrorMessage(error)}</p>
      <button className='secondary-button' onClick={onRetry} type='button'>
        {marketplaceCopy.common.retry}
      </button>
    </section>
  );
}

export function SectionMessage({ children }: { children: ReactNode }): JSX.Element {
  return <p className='marketplace-empty'>{children}</p>;
}
