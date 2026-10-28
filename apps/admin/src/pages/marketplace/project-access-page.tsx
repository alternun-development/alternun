import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { localizedProjectContent, requestMarketplace, type Project } from '../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../marketplace/copy';
import {
  buildAccessRows,
  countGaps,
  projectAccessGapsPath,
} from '../../marketplace/project-access';
import type { AccessMembership, ProjectAccessGap } from '../../marketplace/project-access.types';
import { LoadingPanel, SectionMessage } from './components';
import type { ProjectAccessState, ProjectAccessTableProps } from './project-access-page.types';

const copy = marketplaceCopy.projectAccess;

function People({ names }: { names: readonly string[] }): JSX.Element {
  return names.length === 0 ? (
    <span className='project-access-none'>{copy.nobody}</span>
  ) : (
    <ul className='project-access-people'>
      {names.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  );
}

export function ProjectAccessTable({ rows }: ProjectAccessTableProps): JSX.Element {
  return (
    <div className='marketplace-card-grid'>
      {rows.map((row) => (
        <article
          className={`metric-card project-access-card${
            row.missingAdmin || row.missingAccount ? ' has-gap' : ''
          }`}
          key={row.projectId}
        >
          <h4>{row.title}</h4>
          <small>{row.slug}</small>
          {row.missingAdmin ? <p className='error-text'>{copy.missingAdmin}</p> : null}
          {row.missingAccount ? <p className='error-text'>{copy.missingAccount}</p> : null}
          <h5>{copy.admins}</h5>
          <People names={row.admins} />
          <h5>{copy.moderators}</h5>
          <People names={row.moderators} />
          {row.readOnly.length > 0 ? (
            <>
              <h5>{copy.readOnly}</h5>
              <People names={row.readOnly} />
            </>
          ) : null}
          <Link className='inline-link' to={`/marketplace/projects/${row.projectId}`}>
            {copy.manage}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function ProjectAccessPage(): JSX.Element {
  const [state, setState] = useState<ProjectAccessState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    Promise.all([
      requestMarketplace<Project[]>('/v1/admin/projects'),
      requestMarketplace<AccessMembership[]>('/v1/admin/project-memberships'),
      requestMarketplace<ProjectAccessGap[]>(projectAccessGapsPath),
    ])
      .then(([projects, memberships, gaps]) => {
        if (!active) return;
        const rows = buildAccessRows(
          projects.map((project) => ({
            id: project.id,
            enterpriseId: project.enterpriseId,
            slug: project.slug,
            title: localizedProjectContent(project)?.title ?? project.slug,
          })),
          memberships,
          gaps
        );
        setState({ kind: 'success', rows });
      })
      .catch((error: unknown) => {
        if (active) setState({ kind: 'error', error });
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.kind === 'loading') return <LoadingPanel />;

  return (
    <div className='page-grid'>
      <section className='panel hero-panel'>
        <h2>{copy.heading}</h2>
        <p>{copy.intro}</p>
        {state.kind === 'success' ? <p>{copy.gapsSummary(countGaps(state.rows))}</p> : null}
      </section>
      <section className='panel'>
        {state.kind === 'error' ? (
          <p className='error-text'>{marketplaceErrorMessage(state.error)}</p>
        ) : state.rows.length === 0 ? (
          <SectionMessage>{copy.empty}</SectionMessage>
        ) : (
          <ProjectAccessTable rows={state.rows} />
        )}
      </section>
    </div>
  );
}
