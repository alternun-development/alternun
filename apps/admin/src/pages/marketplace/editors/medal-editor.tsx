import { useCallback, useEffect, useState } from 'react';
import { requestMarketplace } from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import {
  buildCreateMedalBody,
  emptyNewMedal,
  medalPath,
  medalsPath,
  validateNewMedal,
} from '../../../marketplace/medals';
import type {
  NewMedalErrors,
  NewMedalValues,
  ProjectMedal,
} from '../../../marketplace/medals.types';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import { SectionMessage } from '../components';
import type { MedalEditorProps, MedalsState } from './medal-editor.types';

const copy = marketplaceCopy.medals;

/** The medal catalog of a project. Only Super Admins see it; reporters pick from it in the report form. */
export function MedalEditor({ project, roles }: MedalEditorProps): JSX.Element | null {
  const canManage = hasMarketplacePermission(roles, 'medals:manage');
  const [state, setState] = useState<MedalsState>({ kind: 'loading' });
  const [values, setValues] = useState<NewMedalValues>(emptyNewMedal);
  const [errors, setErrors] = useState<NewMedalErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState<string>();

  const load = useCallback(() => {
    requestMarketplace<ProjectMedal[]>(medalsPath(project.id))
      .then((data) => setState({ kind: 'success', data }))
      .catch((requestError: unknown) => setState({ kind: 'error', error: requestError }));
  }, [project.id]);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  if (!canManage) return null;

  async function add(): Promise<void> {
    const found = validateNewMedal(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await requestMarketplace<ProjectMedal>(medalsPath(project.id), {
        method: 'POST',
        body: buildCreateMedalBody(values),
      });
      setValues(emptyNewMedal);
      setSuccess(copy.added);
      load();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(medal: ProjectMedal): Promise<void> {
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await requestMarketplace<ProjectMedal>(medalPath(project.id, medal.id), {
        method: 'PATCH',
        body: { isActive: !medal.isActive },
      });
      setSuccess(medal.isActive ? copy.retired : copy.restored);
      load();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  const medals = state.kind === 'success' ? state.data : [];

  return (
    <section className='panel'>
      <h3>{copy.heading}</h3>
      <p>{copy.intro}</p>
      {success ? (
        <p className='marketplace-success' role='status'>
          {success}
        </p>
      ) : null}
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      {state.kind === 'error' ? (
        <p className='error-text'>{marketplaceErrorMessage(state.error)}</p>
      ) : null}
      {state.kind === 'success' && medals.length === 0 ? (
        <SectionMessage>{copy.empty}</SectionMessage>
      ) : null}
      {medals.length > 0 ? (
        <div className='marketplace-card-grid'>
          {medals.map((medal) => (
            <article
              className={`metric-card medal-card${medal.isActive ? '' : ' is-retired'}`}
              key={medal.id}
            >
              <img alt={medal.name} height={64} loading='lazy' src={medal.imageUrl} width={64} />
              <h4>{medal.name}</h4>
              {medal.description ? <small>{medal.description}</small> : null}
              <button
                className='secondary-button'
                disabled={busy}
                onClick={() => void toggle(medal)}
                type='button'
              >
                {medal.isActive ? copy.retire : copy.restore}
              </button>
            </article>
          ))}
        </div>
      ) : null}

      <div className='marketplace-inline-form'>
        <h4>{copy.addHeading}</h4>
        <label>
          <span>{copy.name}</span>
          <input
            value={values.name}
            onChange={(event) => {
              setValues((current) => ({ ...current, name: event.target.value }));
              setErrors((current) => ({ ...current, name: undefined }));
            }}
          />
          {errors.name ? <strong className='error-text'>{errors.name}</strong> : null}
        </label>
        <label>
          <span>{copy.description}</span>
          <input
            value={values.description}
            onChange={(event) => {
              setValues((current) => ({ ...current, description: event.target.value }));
              setErrors((current) => ({ ...current, description: undefined }));
            }}
          />
          {errors.description ? <strong className='error-text'>{errors.description}</strong> : null}
        </label>
        <label>
          <span>{copy.imageUrl}</span>
          <input
            inputMode='url'
            value={values.imageUrl}
            onChange={(event) => {
              setValues((current) => ({ ...current, imageUrl: event.target.value }));
              setErrors((current) => ({ ...current, imageUrl: undefined }));
            }}
          />
          <small>{copy.imageHint}</small>
          {errors.imageUrl ? <strong className='error-text'>{errors.imageUrl}</strong> : null}
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
  );
}
