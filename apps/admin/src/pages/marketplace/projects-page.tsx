import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  activeProjectMedia,
  localizedProjectContent,
  requestMarketplace,
  type Enterprise,
  type Project,
} from '../../marketplace/api';
import { marketplaceCopy } from '../../marketplace/copy';
import { hasMarketplacePermission, useMarketplaceRoles } from '../../marketplace/permissions';
import { ErrorPanel, LoadingPanel, SectionMessage, StatusPill } from './components';
import { ProjectCreateWizard } from './project-create-wizard';

type ProjectListData = {
  projects: Project[];
  enterprises: Enterprise[];
};

async function loadProjectList(): Promise<ProjectListData> {
  const [projects, enterprises] = await Promise.all([
    requestMarketplace<Project[]>('/v1/admin/projects'),
    requestMarketplace<Enterprise[]>('/v1/admin/enterprises'),
  ]);
  return { projects, enterprises };
}

export function MarketplaceProjectsPage(): JSX.Element {
  const [data, setData] = useState<ProjectListData | null>(null);
  const [error, setError] = useState<unknown>();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [success, setSuccess] = useState<string>();
  const roles = useMarketplaceRoles();

  const load = useCallback(() => {
    setError(undefined);
    setData(null);
    void loadProjectList().then(setData).catch(setError);
  }, []);

  useEffect(load, [load]);

  const projects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!data || !query) return data?.projects ?? [];
    return data.projects.filter((project) =>
      (localizedProjectContent(project)?.title ?? '').toLocaleLowerCase().includes(query)
    );
  }, [data, search]);

  if (error) return <ErrorPanel error={error} onRetry={load} />;
  if (!data) return <LoadingPanel />;

  return (
    <div className='page-grid'>
      <section className='panel hero-panel'>
        <div className='panel-heading'>
          <div>
            <span className='panel-label'>{marketplaceCopy.projectList.eyebrow}</span>
            <h2>{marketplaceCopy.projectList.title}</h2>
            <p>{marketplaceCopy.projectList.intro}</p>
          </div>
          {roles && hasMarketplacePermission(roles, 'projects:create') ? (
            <button className='primary-button' onClick={() => setShowCreate(true)} type='button'>
              {marketplaceCopy.create.button}
            </button>
          ) : null}
        </div>
        {success ? (
          <p className='marketplace-success' role='status'>
            {success}
          </p>
        ) : null}
        <label className='marketplace-search'>
          <span>{marketplaceCopy.projectList.searchLabel}</span>
          <input
            type='search'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={marketplaceCopy.projectList.searchPlaceholder}
          />
        </label>
      </section>

      {showCreate && roles ? (
        <ProjectCreateWizard
          enterprises={data.enterprises}
          roles={roles}
          onCancel={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            setSuccess(marketplaceCopy.create.success);
            load();
          }}
          onEnterpriseCreated={(enterprise) => {
            setData((current) =>
              current ? { ...current, enterprises: [...current.enterprises, enterprise] } : current
            );
            setSuccess(marketplaceCopy.create.enterpriseSuccess);
          }}
        />
      ) : null}

      {data.projects.length === 0 ? (
        <section className='panel'>
          <SectionMessage>{marketplaceCopy.projectList.empty}</SectionMessage>
        </section>
      ) : projects.length === 0 ? (
        <section className='panel'>
          <SectionMessage>{marketplaceCopy.projectList.noResults}</SectionMessage>
        </section>
      ) : (
        <section className='marketplace-card-grid' aria-label={marketplaceCopy.projectList.title}>
          {projects.map((project) => {
            const content = localizedProjectContent(project);
            const title = content?.title?.trim()
              ? content.title
              : marketplaceCopy.common.notAvailable;
            const cover = activeProjectMedia(project, 'cover');
            const enterprise = data.enterprises.find((item) => item.id === project.enterpriseId);
            return (
              <article className='panel marketplace-project-card' key={project.id}>
                {cover ? (
                  <img
                    className='marketplace-card-image'
                    src={cover.url}
                    alt={cover.altText[project.defaultLocale] || title}
                  />
                ) : (
                  <div className='marketplace-image-fallback'>
                    {marketplaceCopy.projectList.coverFallback}
                  </div>
                )}
                <div className='marketplace-card-body'>
                  <StatusPill status={project.status} />
                  <h3>{title}</h3>
                  <p>{enterprise?.displayName ?? marketplaceCopy.projectList.enterpriseFallback}</p>
                  <Link className='inline-link' to={`/marketplace/projects/${project.id}`}>
                    {marketplaceCopy.common.openProject}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
