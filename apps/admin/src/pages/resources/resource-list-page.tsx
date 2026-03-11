import { useList } from '@refinedev/core';
import { Link } from 'react-router-dom';
import { getAdminResource } from '../../resources/catalog';

interface ResourceListPageProps {
  resourceName: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? '[]' : `${value.length} items`;
  }

  return JSON.stringify(value);
}

function getRecordId(record: Record<string, unknown>, index: number): string {
  const rawId = record.id ?? record.uuid ?? record.slug ?? record.key;
  return rawId !== undefined ? String(rawId) : String(index + 1);
}

export function ResourceListPage({ resourceName }: ResourceListPageProps) {
  const resource = getAdminResource(resourceName);
  const list = useList({
    resource: resourceName,
    pagination: {
      currentPage: 1,
      pageSize: 20,
    },
    sorters: [
      {
        field: 'updatedAt',
        order: 'desc',
      },
    ],
    meta: {
      endpoint: resource.meta.endpoint,
    },
    queryOptions: {
      retry: false,
    },
  });

  const records = (list.result?.data ?? []) as Record<string, unknown>[];
  const columns =
    records.length > 0 ? Object.keys(records[0]).slice(0, 5) : ['id', 'status', 'updatedAt'];
  const total = list.result?.total ?? records.length;

  return (
    <section className='page-grid'>
      <article className='panel'>
        <span className='panel-label'>{resource.name}</span>
        <h2>{resource.meta.title}</h2>
        <p>{resource.meta.description}</p>
        <div className='endpoint-chip'>{resource.meta.endpoint}</div>
      </article>

      <article className='panel'>
        <div className='panel-heading'>
          <div>
            <span className='panel-label'>List view</span>
            <h3>{total} records</h3>
          </div>
          {resource.show ? <span className='status-pill'>detail routes enabled</span> : null}
        </div>

        {list.query.isLoading ? <p>Loading records...</p> : null}
        {list.query.isError ? (
          <p className='error-text'>
            {list.query.error instanceof Error ? list.query.error.message : 'Request failed.'}
          </p>
        ) : null}
        {!list.query.isLoading && records.length === 0 ? <p>{resource.meta.emptyState}</p> : null}

        {records.length > 0 ? (
          <div className='data-table-wrap'>
            <table className='data-table'>
              <thead>
                <tr>
                  {columns.map(column => (
                    <th key={column}>{column}</th>
                  ))}
                  {resource.show ? <th>details</th> : null}
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => {
                  const recordId = getRecordId(record, index);

                  return (
                    <tr key={recordId}>
                      {columns.map(column => (
                        <td key={column}>{formatValue(record[column])}</td>
                      ))}
                      {resource.show ? (
                        <td>
                          <Link className='inline-link' to={`${resource.list}/${recordId}`}>
                            inspect
                          </Link>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
