import { useOne } from '@refinedev/core';
import { Link, useParams } from 'react-router-dom';
import { getAdminResource } from '../../resources/catalog';

interface ResourceShowPageProps {
  resourceName: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

export function ResourceShowPage({ resourceName }: ResourceShowPageProps) {
  const resource = getAdminResource(resourceName);
  const params = useParams();
  const id = params.id;
  const detail = useOne({
    resource: resourceName,
    id: id ?? '',
    meta: {
      endpoint: resource.meta.endpoint,
    },
    queryOptions: {
      enabled: Boolean(id),
      retry: false,
    },
  });

  const record = (detail.result?.data ?? null) as Record<string, unknown> | null;

  return (
    <section className='page-grid'>
      <article className='panel'>
        <span className='panel-label'>{resource.meta.title}</span>
        <h2>Record {id ?? 'unknown'}</h2>
        <p>{resource.meta.description}</p>
        <Link className='inline-link' to={resource.list}>
          Back to {resource.meta.title}
        </Link>
      </article>

      <article className='panel'>
        {detail.query.isLoading ? <p>Loading record...</p> : null}
        {detail.query.isError ? (
          <p className='error-text'>
            {detail.query.error instanceof Error ? detail.query.error.message : 'Request failed.'}
          </p>
        ) : null}
        {!detail.query.isLoading && !record ? <p>No record payload returned.</p> : null}

        {record ? (
          <dl className='record-grid'>
            {Object.entries(record).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </article>
    </section>
  );
}
