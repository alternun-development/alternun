import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestMarketplace, type Enterprise, type Project } from '../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../marketplace/copy';
import { moveId, saveMarketplaceOrder } from '../../marketplace/ordering';
import { hasMarketplacePermission, useMarketplaceRoles } from '../../marketplace/permissions';
import { ErrorPanel, LoadingPanel, SectionMessage, StatusPill } from './components';
import {
  enterpriseCreateBody,
  enterpriseDraft,
  validateEnterpriseDraft,
} from './editors/enterprise-editor';
import { OrderControls } from './order-controls';
import { slugFromName } from './project-create-wizard';
import type { EnterpriseDraft } from './editors/enterprise-editor.types';
import type { EnterpriseCreateFormProps, EnterpriseListData } from './enterprises-page.types';

async function loadEnterpriseList(): Promise<EnterpriseListData> {
  const [enterprises, projects] = await Promise.all([
    requestMarketplace<Enterprise[]>('/v1/admin/enterprises'),
    requestMarketplace<Project[]>('/v1/admin/projects'),
  ]);
  return { enterprises, projects };
}

function EnterpriseCreateForm({ onCancel, onCreated }: EnterpriseCreateFormProps): JSX.Element {
  const [draft, setDraft] = useState<EnterpriseDraft>(() => enterpriseDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const copy = marketplaceCopy.enterpriseForm;

  function update(field: keyof EnterpriseDraft, value: string): void {
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === 'displayName' ? { slug: slugFromName(value) } : {}),
    }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function submit(): Promise<void> {
    const nextErrors = validateEnterpriseDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setRequestError(undefined);
    try {
      onCreated(
        await requestMarketplace<Enterprise>('/v1/admin/enterprises', {
          method: 'POST',
          body: enterpriseCreateBody(draft),
        })
      );
    } catch (error) {
      setRequestError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='panel'>
      <h3>{copy.createTitle}</h3>
      {requestError ? <p className='error-text'>{marketplaceErrorMessage(requestError)}</p> : null}
      <div className='marketplace-form-grid'>
        <label>
          <span>{copy.name}</span>
          <input
            value={draft.displayName}
            onChange={(event) => update('displayName', event.target.value)}
          />
          {errors.displayName ? <strong className='error-text'>{errors.displayName}</strong> : null}
        </label>
        <label>
          <span>{copy.slug}</span>
          <input
            value={draft.slug}
            onChange={(event) => update('slug', event.target.value.toLowerCase())}
          />
          <small>{copy.slugHint}</small>
          {errors.slug ? <strong className='error-text'>{errors.slug}</strong> : null}
        </label>
        <label>
          <span>{copy.legalName}</span>
          <input
            value={draft.legalName}
            onChange={(event) => update('legalName', event.target.value)}
          />
        </label>
        <label>
          <span>{copy.country}</span>
          <input
            maxLength={2}
            value={draft.countryCode}
            onChange={(event) => update('countryCode', event.target.value.toUpperCase())}
          />
          <small>{copy.countryHint}</small>
          {errors.countryCode ? <strong className='error-text'>{errors.countryCode}</strong> : null}
        </label>
        <label>
          <span>{copy.website}</span>
          <input
            type='url'
            value={draft.websiteUrl}
            placeholder={copy.websitePlaceholder}
            onChange={(event) => update('websiteUrl', event.target.value)}
          />
          {errors.websiteUrl ? <strong className='error-text'>{errors.websiteUrl}</strong> : null}
        </label>
      </div>
      <div className='marketplace-form-actions'>
        <button className='secondary-button' onClick={onCancel} type='button'>
          {copy.cancel}
        </button>
        <button
          className='primary-button'
          disabled={saving}
          onClick={() => void submit()}
          type='button'
        >
          {copy.create}
        </button>
      </div>
    </section>
  );
}

export function MarketplaceEnterprisesPage(): JSX.Element {
  const [data, setData] = useState<EnterpriseListData | null>(null);
  const [error, setError] = useState<unknown>();
  const [showCreate, setShowCreate] = useState(false);
  const [success, setSuccess] = useState<string>();
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState<unknown>();
  const roles = useMarketplaceRoles();
  const canReorder = Boolean(roles && hasMarketplacePermission(roles, 'enterprises:reorder'));

  const load = useCallback(() => {
    setError(undefined);
    setData(null);
    void loadEnterpriseList().then(setData).catch(setError);
  }, []);

  async function move(index: number, delta: -1 | 1): Promise<void> {
    if (!data) return;
    setOrdering(true);
    setOrderError(undefined);
    try {
      const enterprises = await saveMarketplaceOrder<Enterprise>(
        'enterprises',
        moveId(
          data.enterprises.map(({ id }) => id),
          index,
          delta
        )
      );
      setData((current) => (current ? { ...current, enterprises } : current));
      setSuccess(marketplaceCopy.ordering.saved);
    } catch (requestError) {
      setOrderError(requestError);
    } finally {
      setOrdering(false);
    }
  }

  useEffect(load, [load]);

  if (error) return <ErrorPanel error={error} onRetry={load} />;
  if (!data) return <LoadingPanel />;

  return (
    <div className='page-grid'>
      <section className='panel hero-panel'>
        <div className='panel-heading'>
          <div>
            <span className='panel-label'>{marketplaceCopy.enterpriseList.eyebrow}</span>
            <h2>{marketplaceCopy.enterpriseList.title}</h2>
            <p>{marketplaceCopy.enterpriseList.intro}</p>
          </div>
          {roles && hasMarketplacePermission(roles, 'enterprises:create') ? (
            <button className='primary-button' onClick={() => setShowCreate(true)} type='button'>
              {marketplaceCopy.enterpriseList.create}
            </button>
          ) : null}
        </div>
        {success ? (
          <p className='marketplace-success' role='status'>
            {success}
          </p>
        ) : null}
        {canReorder ? <p>{marketplaceCopy.ordering.hint}</p> : null}
        {orderError ? <p className='error-text'>{marketplaceErrorMessage(orderError)}</p> : null}
      </section>

      {showCreate ? (
        <EnterpriseCreateForm
          onCancel={() => setShowCreate(false)}
          onCreated={(enterprise) => {
            setShowCreate(false);
            setSuccess(marketplaceCopy.enterpriseList.created);
            setData((current) =>
              current ? { ...current, enterprises: [...current.enterprises, enterprise] } : current
            );
          }}
        />
      ) : null}

      {data.enterprises.length === 0 ? (
        <section className='panel'>
          <SectionMessage>{marketplaceCopy.enterprisesResource.empty}</SectionMessage>
        </section>
      ) : (
        <section
          className='marketplace-card-grid'
          aria-label={marketplaceCopy.enterpriseList.title}
        >
          {data.enterprises.map((enterprise, index) => (
            <article className='metric-card' key={enterprise.id}>
              <StatusPill status={enterprise.status} />
              <h4>{enterprise.displayName}</h4>
              <p>
                {marketplaceCopy.enterpriseList.projectCount(
                  data.projects.filter((project) => project.enterpriseId === enterprise.id).length
                )}
              </p>
              <Link className='inline-link' to={`/marketplace/enterprises/${enterprise.id}`}>
                {marketplaceCopy.enterpriseList.openEnterprise}
              </Link>
              {canReorder ? (
                <OrderControls
                  count={data.enterprises.length}
                  disabled={ordering}
                  index={index}
                  onMove={(delta) => void move(index, delta)}
                />
              ) : null}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
