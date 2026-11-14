import { useCallback, useEffect, useState } from 'react';
import {
  localizedProjectContent,
  requestMarketplace,
  type Enterprise,
  type Project,
} from '../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../marketplace/copy';
import {
  buildHonorAwardGrantBody,
  buildHonorAwardRecipeBody,
  emptyHonorAwardGrant,
  emptyHonorAwardRecipe,
  HONOR_AWARD_AUDIENCES,
  HONOR_AWARD_KINDS,
  HONOR_AWARD_TIERS,
  honorAwardGrantsPath,
  honorAwardRecipePath,
  honorAwardRecipesPath,
  honorAwardRevokePath,
  recipeToValues,
  sortHonorAwardRecipes,
  validateHonorAwardGrant,
  validateHonorAwardRecipe,
} from '../../marketplace/honor-awards';
import type {
  HonorAwardGrant,
  HonorAwardGrantValues,
  HonorAwardRecipe,
  HonorAwardRecipeErrors,
  HonorAwardRecipeValues,
} from '../../marketplace/honor-awards.types';
import { hasMarketplacePermission, useMarketplaceRoles } from '../../marketplace/permissions';
import { ErrorPanel, LoadingPanel, SectionMessage } from './components';
import type {
  HonorAwardGrantsPanelProps,
  HonorAwardGrantsState,
  HonorAwardRecipeFormProps,
  HonorAwardsState,
  TextField,
} from './honor-awards-page.types';

const copy = marketplaceCopy.honorAwards;

const TEXT_FIELDS: ReadonlyArray<[TextField, boolean]> = [
  ['title', false],
  ['classification', false],
  ['purpose', true],
  ['eventName', false],
  ['eventYear', false],
  ['venueName', false],
  ['venueLocation', false],
  ['airsAmount', false],
  ['badgeImageUrl', false],
  ['frontImageUrl', false],
  ['backImageUrl', false],
];

function projectLabel(project: Project): string {
  const title = localizedProjectContent(project)?.title?.trim();
  return title ? title : project.slug;
}

export function HonorAwardRecipeForm({
  values,
  errors,
  editing,
  busy,
  projects,
  enterprises,
  onChange,
  onSubmit,
  onCancel,
}: HonorAwardRecipeFormProps): JSX.Element {
  const set = (patch: Partial<HonorAwardRecipeValues>) => onChange({ ...values, ...patch });
  return (
    <section className='panel marketplace-inline-form'>
      <h3>{editing ? copy.editHeading : copy.newHeading}</h3>
      <label>
        <span>{copy.fields.kind}</span>
        <select
          value={values.kind}
          onChange={(event) => set({ kind: event.target.value as HonorAwardRecipeValues['kind'] })}
        >
          {HONOR_AWARD_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {copy.kinds[kind]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{copy.fields.tier}</span>
        <select
          value={values.tier}
          onChange={(event) => set({ tier: event.target.value as HonorAwardRecipeValues['tier'] })}
        >
          {HONOR_AWARD_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {copy.tiers[tier]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{copy.fields.audience}</span>
        <select
          disabled={editing}
          value={values.audience}
          onChange={(event) =>
            set({ audience: event.target.value as HonorAwardRecipeValues['audience'] })
          }
        >
          {HONOR_AWARD_AUDIENCES.map((audience) => (
            <option key={audience} value={audience}>
              {copy.audiences[audience]}
            </option>
          ))}
        </select>
      </label>
      {TEXT_FIELDS.map(([field, multiline]) => (
        <label key={field}>
          <span>{copy.fields[field]}</span>
          {multiline ? (
            <textarea
              rows={3}
              value={values[field]}
              onChange={(event) => set({ [field]: event.target.value })}
            />
          ) : (
            <input
              inputMode={field === 'eventYear' || field === 'airsAmount' ? 'numeric' : undefined}
              value={values[field]}
              onChange={(event) => set({ [field]: event.target.value })}
            />
          )}
          {field === 'airsAmount' ? <small>{copy.fields.airsHint}</small> : null}
          {field === 'badgeImageUrl' ? <small>{copy.fields.imageHint}</small> : null}
          {errors[field] ? <strong className='error-text'>{errors[field]}</strong> : null}
        </label>
      ))}
      <label>
        <span>{copy.fields.project}</span>
        <select
          value={values.projectId}
          onChange={(event) => set({ projectId: event.target.value })}
        >
          <option value=''>{copy.fields.none}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {projectLabel(project)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{copy.fields.partner}</span>
        <select
          value={values.partnerEnterpriseId}
          onChange={(event) => set({ partnerEnterpriseId: event.target.value })}
        >
          <option value=''>{copy.fields.none}</option>
          {enterprises.map((enterprise) => (
            <option key={enterprise.id} value={enterprise.id}>
              {enterprise.displayName}
            </option>
          ))}
        </select>
      </label>
      <div className='marketplace-form-actions'>
        <button className='primary-button' disabled={busy} onClick={onSubmit} type='button'>
          {editing ? copy.save : copy.create}
        </button>
        {editing ? (
          <button className='secondary-button' disabled={busy} onClick={onCancel} type='button'>
            {copy.cancel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function HonorAwardGrantsPanel({
  recipe,
  enterprises,
  onMessage,
}: HonorAwardGrantsPanelProps): JSX.Element {
  const [state, setState] = useState<HonorAwardGrantsState>({ kind: 'loading' });
  const [values, setValues] = useState<HonorAwardGrantValues>(emptyHonorAwardGrant);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    requestMarketplace<HonorAwardGrant[]>(honorAwardGrantsPath(recipe.id))
      .then((data) => setState({ kind: 'success', data }))
      .catch((requestError: unknown) => setState({ kind: 'error', error: requestError }));
  }, [recipe.id]);

  useEffect(() => load(), [load]);

  async function run(action: () => Promise<unknown>, message: string): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      onMessage(message);
      load();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  function grant(): void {
    const problem = validateHonorAwardGrant(recipe, values);
    setFormError(problem);
    if (problem) return;
    void run(async () => {
      await requestMarketplace<HonorAwardGrant>(honorAwardGrantsPath(recipe.id), {
        method: 'POST',
        body: buildHonorAwardGrantBody(recipe, values),
      });
      setValues(emptyHonorAwardGrant);
    }, copy.grants.granted);
  }

  const enterpriseName = (id: string | null) =>
    enterprises.find((enterprise) => enterprise.id === id)?.displayName ?? id ?? '';
  const grants = state.kind === 'success' ? state.data : [];

  return (
    <div className='honor-award-grants'>
      <h4>{copy.grants.heading}</h4>
      {state.kind === 'error' ? (
        <p className='error-text'>{marketplaceErrorMessage(state.error)}</p>
      ) : null}
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      {state.kind === 'success' && grants.length === 0 ? (
        <SectionMessage>{copy.grants.empty}</SectionMessage>
      ) : null}
      {grants.length > 0 ? (
        <ul className='honor-award-grant-list'>
          {grants.map((item) => (
            <li key={item.id}>
              <span>
                {item.recipientType === 'user'
                  ? copy.grants.recipientUser(item.userId ?? '')
                  : enterpriseName(item.enterpriseId)}
              </span>
              <small>
                {copy.grants.statuses[item.status]} · {copy.grants.sources[item.source]}
              </small>
              {item.status !== 'revoked' ? (
                <button
                  className='secondary-button'
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => requestMarketplace(honorAwardRevokePath(item.id), { method: 'POST' }),
                      copy.grants.revoked
                    )
                  }
                  type='button'
                >
                  {copy.grants.revoke}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {recipe.isActive ? (
        <div className='marketplace-inline-form'>
          {recipe.audience === 'user' ? (
            <label>
              <span>{copy.grants.email}</span>
              <input
                inputMode='email'
                value={values.email}
                onChange={(event) =>
                  setValues((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
          ) : (
            <label>
              <span>{copy.grants.enterprise}</span>
              <select
                value={values.enterpriseId}
                onChange={(event) =>
                  setValues((current) => ({ ...current, enterpriseId: event.target.value }))
                }
              >
                <option value=''>{copy.fields.none}</option>
                {enterprises.map((enterprise) => (
                  <option key={enterprise.id} value={enterprise.id}>
                    {enterprise.displayName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>{copy.grants.note}</span>
            <input
              value={values.note}
              onChange={(event) =>
                setValues((current) => ({ ...current, note: event.target.value }))
              }
            />
          </label>
          {formError ? <strong className='error-text'>{formError}</strong> : null}
          <div className='marketplace-form-actions'>
            <button className='primary-button' disabled={busy} onClick={grant} type='button'>
              {copy.grants.grant}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Honor award recipes and their grants; Super Admins only. */
export function HonorAwardsPage(): JSX.Element {
  const roles = useMarketplaceRoles();
  const canManage = roles ? hasMarketplacePermission(roles, 'medals:manage') : false;
  const [state, setState] = useState<HonorAwardsState>({ kind: 'loading' });
  const [values, setValues] = useState<HonorAwardRecipeValues>(emptyHonorAwardRecipe);
  const [errors, setErrors] = useState<HonorAwardRecipeErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openGrantsId, setOpenGrantsId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState<string>();

  const load = useCallback(() => {
    Promise.all([
      requestMarketplace<HonorAwardRecipe[]>(honorAwardRecipesPath),
      requestMarketplace<Project[]>('/v1/admin/projects'),
      requestMarketplace<Enterprise[]>('/v1/admin/enterprises'),
    ])
      .then(([recipes, projects, enterprises]) =>
        setState({
          kind: 'success',
          data: { recipes: sortHonorAwardRecipes(recipes), projects, enterprises },
        })
      )
      .catch((requestError: unknown) => setState({ kind: 'error', error: requestError }));
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  async function run(action: () => Promise<unknown>, message: string): Promise<boolean> {
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await action();
      setSuccess(message);
      load();
      return true;
    } catch (requestError) {
      setError(requestError);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(): Promise<void> {
    const found = validateHonorAwardRecipe(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const body = buildHonorAwardRecipeBody(values);
    const saved = editingId
      ? await run(
          () =>
            requestMarketplace(honorAwardRecipePath(editingId), {
              method: 'PATCH',
              body: { ...body, audience: undefined },
            }),
          copy.saved
        )
      : await run(
          () => requestMarketplace(honorAwardRecipesPath, { method: 'POST', body }),
          copy.created
        );
    if (saved) {
      setValues(emptyHonorAwardRecipe);
      setEditingId(null);
    }
  }

  if (!roles) return <LoadingPanel />;
  if (!canManage)
    return (
      <SectionMessage>{marketplaceErrorMessage({ code: 'PERMISSION_DENIED' })}</SectionMessage>
    );
  if (state.kind === 'loading') return <LoadingPanel />;
  if (state.kind === 'error') return <ErrorPanel error={state.error} onRetry={load} />;
  const { recipes, projects, enterprises } = state.data;

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
        {recipes.length === 0 ? <SectionMessage>{copy.empty}</SectionMessage> : null}
        <div className='marketplace-card-grid'>
          {recipes.map((recipe) => (
            <article
              className={`metric-card honor-award-card${recipe.isActive ? '' : ' is-retired'}`}
              key={recipe.id}
            >
              {recipe.badgeImageUrl ? (
                <img
                  alt={recipe.title}
                  height={64}
                  loading='lazy'
                  src={recipe.badgeImageUrl}
                  width={64}
                />
              ) : null}
              <h4>{recipe.title}</h4>
              <small>
                {copy.kinds[recipe.kind]} · {copy.tiers[recipe.tier]} ·{' '}
                {copy.audiences[recipe.audience]}
              </small>
              <div className='marketplace-form-actions'>
                <button
                  className='secondary-button'
                  disabled={busy}
                  onClick={() => {
                    setEditingId(recipe.id);
                    setValues(recipeToValues(recipe));
                    setErrors({});
                  }}
                  type='button'
                >
                  {copy.edit}
                </button>
                <button
                  className='secondary-button'
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        requestMarketplace(honorAwardRecipePath(recipe.id), {
                          method: 'PATCH',
                          body: { isActive: !recipe.isActive },
                        }),
                      recipe.isActive ? copy.retired : copy.restored
                    )
                  }
                  type='button'
                >
                  {recipe.isActive ? copy.retire : copy.restore}
                </button>
                <button
                  className='secondary-button'
                  onClick={() =>
                    setOpenGrantsId((current) => (current === recipe.id ? null : recipe.id))
                  }
                  type='button'
                >
                  {openGrantsId === recipe.id ? copy.grants.hide : copy.grants.show}
                </button>
              </div>
              {openGrantsId === recipe.id ? (
                <HonorAwardGrantsPanel
                  recipe={recipe}
                  enterprises={enterprises}
                  onMessage={setSuccess}
                />
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <HonorAwardRecipeForm
        values={values}
        errors={errors}
        editing={editingId !== null}
        busy={busy}
        projects={projects}
        enterprises={enterprises}
        onChange={setValues}
        onSubmit={() => void submit()}
        onCancel={() => {
          setEditingId(null);
          setValues(emptyHonorAwardRecipe);
          setErrors({});
        }}
      />
    </div>
  );
}
