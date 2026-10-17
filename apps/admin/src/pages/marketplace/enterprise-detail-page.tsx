import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  localizedProjectContent,
  requestMarketplace,
  type Enterprise,
  type Project,
} from '../../marketplace/api';
import { marketplaceCopy } from '../../marketplace/copy';
import { ErrorPanel, LoadingPanel, SectionMessage, StatusPill } from './components';

type EnterpriseDetail = { enterprise: Enterprise; projects: Project[] };

async function loadEnterprise(id: string): Promise<EnterpriseDetail> {
  const [enterprise, projects] = await Promise.all([
    requestMarketplace<Enterprise>(`/v1/admin/enterprises/${encodeURIComponent(id)}`),
    requestMarketplace<Project[]>('/v1/admin/projects'),
  ]);
  return { enterprise, projects: projects.filter((project) => project.enterpriseId === id) };
}

export function MarketplaceEnterpriseDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const [data, setData] = useState<EnterpriseDetail | null>(null);
  const [error, setError] = useState<unknown>();

  const load = useCallback(() => {
    setData(null);
    setError(undefined);
    void loadEnterprise(id).then(setData).catch(setError);
  }, [id]);

  useEffect(load, [load]);

  if (error) return <ErrorPanel error={error} onRetry={load} />;
  if (!data) return <LoadingPanel />;

  return (
    <div className='page-grid'>
      <section className='panel hero-panel marketplace-detail-heading'>
        <div>
          <span className='panel-label'>{marketplaceCopy.enterpriseDetail.eyebrow}</span>
          <h2>{data.enterprise.displayName}</h2>
        </div>
        <StatusPill status={data.enterprise.status} />
        <Link className='inline-link' to='/marketplace'>
          {marketplaceCopy.common.backToProjects}
        </Link>
      </section>

      <section className='panel'>
        <h3>{marketplaceCopy.enterpriseDetail.heading}</h3>
        <dl className='record-grid marketplace-facts'>
          <div>
            <dt>{marketplaceCopy.enterpriseDetail.status}</dt>
            <dd>
              <StatusPill status={data.enterprise.status} />
            </dd>
          </div>
          <div>
            <dt>{marketplaceCopy.enterpriseDetail.country}</dt>
            <dd>{data.enterprise.countryCode ?? marketplaceCopy.common.notAvailable}</dd>
          </div>
          <div>
            <dt>{marketplaceCopy.enterpriseDetail.website}</dt>
            <dd>
              {data.enterprise.websiteUrl ? (
                <a
                  className='inline-link'
                  href={data.enterprise.websiteUrl}
                  rel='noreferrer'
                  target='_blank'
                >
                  {marketplaceCopy.enterpriseDetail.openWebsite}
                </a>
              ) : (
                marketplaceCopy.common.notAvailable
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className='panel'>
        <h3>{marketplaceCopy.enterpriseDetail.projectsHeading}</h3>
        {data.projects.length === 0 ? (
          <SectionMessage>{marketplaceCopy.enterpriseDetail.projectsEmpty}</SectionMessage>
        ) : (
          <div className='marketplace-card-grid'>
            {data.projects.map((project) => (
              <article className='metric-card' key={project.id}>
                <StatusPill status={project.status} />
                <h4>
                  {localizedProjectContent(project)?.title ?? marketplaceCopy.common.notAvailable}
                </h4>
                <Link className='inline-link' to={`/marketplace/projects/${project.id}`}>
                  {marketplaceCopy.common.openProject}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
