import type { ReactNode } from 'react';
import { marketplaceCopy, marketplaceErrorMessage } from '../../marketplace/copy';
import type { EnterpriseStatus, ProjectStatus } from '../../marketplace/api';

export function StatusPill({ status }: { status: ProjectStatus | EnterpriseStatus }): JSX.Element {
  return (
    <span className={`status-pill marketplace-status marketplace-status-${status}`}>
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
