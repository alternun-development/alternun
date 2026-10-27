import { useCallback, useEffect, useState } from 'react';
import { requestMarketplace } from '../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../marketplace/copy';
import { hasMarketplacePermission, useMarketplaceRoles } from '../../marketplace/permissions';
import {
  buildCreateProjectTypeBody,
  emptyNewProjectType,
  projectTypeLabel,
  projectTypePath,
  projectTypesPath,
  sortProjectTypes,
  validateNewProjectType,
} from '../../marketplace/project-types';
import type {
  NewProjectTypeErrors,
  NewProjectTypeValues,
  ProjectType,
} from '../../marketplace/project-types.types';
import { LoadingPanel, SectionMessage } from './components';
import type { ProjectTypeRowProps, ProjectTypesState } from './project-types-page.types';

const copy = marketplaceCopy.projectTypes;

function ProjectTypeRow({
  type,
  busy,
  canManage,
  onToggleDocument,
  onToggleActive,
}: ProjectTypeRowProps): JSX.Element {
  return (
    <article className={`metric-card project-type-card${type.isActive ? '' : ' is-retired'}`}>
      <h4>{projectTypeLabel(type)}</h4>
      <small>
        {type.code}
        {type.labels.es ? ` · ${type.labels.es}` : ''}
      </small>
      <label className='project-type-toggle'>
        <input
          checked={type.requiresDocumentNumber}
          disabled={!canManage || busy}
          onChange={() => onToggleDocument(type)}
          type='checkbox'
        />
        <span>{copy.requiresDocument}</span>
      </label>
      <label className='project-type-toggle'>
        <input
          checked={type.isActive}
          disabled={!canManage || busy}
          onChange={() => onToggleActive(type)}
          type='checkbox'
        />
        <span>{copy.active}</span>
      </label>
    </article>
  );
}

export function ProjectTypesPage(): JSX.Element {
  const roles = useMarketplaceRoles();
  const [state, setState] = useState<ProjectTypesState>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState<string>();
  const [values, setValues] = useState<NewProjectTypeValues>(emptyNewProjectType);
  const [errors, setErrors] = useState<NewProjectTypeErrors>({});
  const canManage = roles ? hasMarketplacePermission(roles, 'project_types:manage') : false;

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    requestMarketplace<ProjectType[]>(projectTypesPath)
      .then((data) => setState({ kind: 'success', data: sortProjectTypes(data) }))
      .catch((requestError: unknown) => setState({ kind: 'error', error: requestError }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function change(
    type: ProjectType,
    body: Record<string, unknown>,
    message: string
  ): Promise<void> {
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await requestMarketplace<ProjectType>(projectTypePath(type.code), {
        method: 'PATCH',
        body,
      });
      setSuccess(message);
      load();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function add(): Promise<void> {
    const found = validateNewProjectType(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await requestMarketplace<ProjectType>(projectTypesPath, {
        method: 'POST',
        body: buildCreateProjectTypeBody(values),
      });
      setValues(emptyNewProjectType);
      setSuccess(copy.added);
      load();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  if (!roles || state.kind === 'loading') return <LoadingPanel />;

  return (
    <div className='page-grid'>
      <section className='panel hero-panel'>
        <h2>{copy.heading}</h2>
        <p>{copy.intro}</p>
      </section>

      {success ? (
        <p className='marketplace-success' role='status'>
          {success}
        </p>
      ) : null}
      {error ? (
        <p className='error-text' role='alert'>
          {marketplaceErrorMessage(error)}
        </p>
      ) : null}

      <section className='panel'>
        {state.kind === 'error' ? (
          <p className='error-text'>{marketplaceErrorMessage(state.error)}</p>
        ) : state.data.length === 0 ? (
          <SectionMessage>{copy.empty}</SectionMessage>
        ) : (
          <div className='marketplace-card-grid'>
            {state.data.map((type) => (
              <ProjectTypeRow
                busy={busy}
                canManage={canManage}
                key={type.code}
                onToggleActive={(target) =>
                  void change(
                    target,
                    { isActive: !target.isActive },
                    target.isActive ? copy.retired : copy.restored
                  )
                }
                onToggleDocument={(target) =>
                  void change(
                    target,
                    { requiresDocumentNumber: !target.requiresDocumentNumber },
                    copy.updated
                  )
                }
                type={type}
              />
            ))}
          </div>
        )}
        {!canManage ? <p>{copy.permission}</p> : null}
      </section>

      {canManage ? (
        <section className='panel'>
          <h3>{copy.addHeading}</h3>
          <div className='marketplace-inline-form'>
            <label>
              <span>{copy.nameEn}</span>
              <input
                value={values.nameEn}
                onChange={(event) => {
                  setValues((current) => ({ ...current, nameEn: event.target.value }));
                  setErrors((current) => ({ ...current, nameEn: undefined }));
                }}
              />
              {errors.nameEn ? <strong className='error-text'>{errors.nameEn}</strong> : null}
            </label>
            <label>
              <span>{copy.nameEs}</span>
              <input
                value={values.nameEs}
                onChange={(event) => {
                  setValues((current) => ({ ...current, nameEs: event.target.value }));
                  setErrors((current) => ({ ...current, nameEs: undefined }));
                }}
              />
              {errors.nameEs ? <strong className='error-text'>{errors.nameEs}</strong> : null}
            </label>
            <label className='project-type-toggle'>
              <input
                checked={values.requiresDocumentNumber}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    requiresDocumentNumber: event.target.checked,
                  }))
                }
                type='checkbox'
              />
              <span>{copy.requiresDocument}</span>
            </label>
            <div className='marketplace-form-actions'>
              <button
                className='primary-button'
                disabled={busy}
                onClick={() => void add()}
                type='button'
              >
                {copy.add}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
