import { useEffect, useMemo, useState } from 'react';
import type { AdminRole } from '../../auth/oidc-client';
import { requestMarketplace, type Enterprise, type Project } from '../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../marketplace/copy';
import { hasMarketplacePermission } from '../../marketplace/permissions';

const categoryCodes = [
  'hospitality_ecotourism',
  'conservation',
  'productive_enterprise',
  'regenerative_agriculture',
  'community',
  'education',
  'other',
] as const;
const languages = ['en', 'es', 'th'] as const;
const timeZones = Object.keys(marketplaceCopy.create.timeZones);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ProjectDraft = {
  name: string;
  slug: string;
  categoryCode: string;
  enterpriseId: string;
  location: string;
  timeZone: string;
  defaultLocale: string;
  theme: string;
  description: string;
  contribution: string;
};

export function slugFromName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.join('-');

  return (slug ?? '').slice(0, 80).replace(/-+$/, '');
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 80 && slugPattern.test(slug);
}

export function resolveDefaultTimeZone(
  detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
): string {
  return timeZones.includes(detectedTimeZone) ? detectedTimeZone : 'UTC';
}

export function validateProjectStep(draft: ProjectDraft, step: number): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (!draft.name.trim()) errors.name = marketplaceCopy.create.validation.name;
    if (!isValidSlug(draft.slug)) errors.slug = marketplaceCopy.create.validation.slug;
    if (!categoryCodes.includes(draft.categoryCode as (typeof categoryCodes)[number]))
      errors.categoryCode = marketplaceCopy.create.validation.category;
    if (!draft.enterpriseId) errors.enterpriseId = marketplaceCopy.create.validation.enterprise;
  }
  if (step === 2) {
    if (!draft.location.trim()) errors.location = marketplaceCopy.create.validation.location;
    if (!draft.timeZone) errors.timeZone = marketplaceCopy.create.validation.timeZone;
  }
  if (step === 3) {
    if (!draft.theme.trim()) errors.theme = marketplaceCopy.create.validation.theme;
    if (!draft.description.trim())
      errors.description = marketplaceCopy.create.validation.description;
    if (!draft.contribution.trim())
      errors.contribution = marketplaceCopy.create.validation.contribution;
  }
  return errors;
}

type Props = {
  enterprises: Enterprise[];
  roles: readonly AdminRole[];
  onCancel: () => void;
  onCreated: (project: Project) => void;
  onEnterpriseCreated: (enterprise: Enterprise) => void;
};

export function ProjectCreateWizard({
  enterprises,
  roles,
  onCancel,
  onCreated,
  onEnterpriseCreated,
}: Props): JSX.Element {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ProjectDraft>({
    name: '',
    slug: '',
    categoryCode: 'hospitality_ecotourism',
    enterpriseId: enterprises[0]?.id ?? '',
    location: '',
    timeZone: resolveDefaultTimeZone(),
    defaultLocale: 'en',
    theme: '',
    description: '',
    contribution: '',
  });
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);
  const [enterpriseName, setEnterpriseName] = useState('');
  const [enterpriseSlug, setEnterpriseSlug] = useState('');

  useEffect(() => {
    if (!slugWasEdited) setDraft((current) => ({ ...current, slug: slugFromName(current.name) }));
  }, [draft.name, slugWasEdited]);

  const categoryOptions = useMemo(
    () =>
      categoryCodes.map((code) => ({
        code,
        label: marketplaceCopy.categories[code],
      })),
    []
  );

  function update<K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]): void {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  function advance(): void {
    const nextErrors = validateProjectStep(draft, step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep((current) => Math.min(3, current + 1));
  }

  async function submit(): Promise<void> {
    const nextErrors = validateProjectStep(draft, 3);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setRequestError(undefined);
    try {
      const project = await requestMarketplace<Project>('/v1/admin/projects', {
        method: 'POST',
        body: {
          enterpriseId: draft.enterpriseId,
          slug: draft.slug,
          categoryCode: draft.categoryCode,
          timeZone: draft.timeZone,
          defaultLocale: draft.defaultLocale,
          content: {
            [draft.defaultLocale]: {
              title: draft.name.trim(),
              location: draft.location.trim(),
              theme: draft.theme.trim(),
              description: draft.description.trim(),
              waysToContribute: [draft.contribution.trim()],
            },
          },
        },
      });
      onCreated(project);
    } catch (error) {
      setRequestError(error);
    } finally {
      setSaving(false);
    }
  }

  async function createEnterprise(): Promise<void> {
    const name = enterpriseName.trim();
    const slug = enterpriseSlug.trim();
    const nextErrors: Record<string, string> = {};
    if (!name) nextErrors.enterpriseName = marketplaceCopy.create.validation.name;
    if (!isValidSlug(slug)) nextErrors.enterpriseSlug = marketplaceCopy.create.validation.slug;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setRequestError(undefined);
    try {
      const enterprise = await requestMarketplace<Enterprise>('/v1/admin/enterprises', {
        method: 'POST',
        body: { displayName: name, slug },
      });
      onEnterpriseCreated(enterprise);
      update('enterpriseId', enterprise.id);
      setShowEnterpriseForm(false);
    } catch (error) {
      setRequestError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-modal='true' className='panel marketplace-dialog' role='dialog'>
      <div className='panel-heading'>
        <div>
          <span className='panel-label'>
            {marketplaceCopy.create.step} {step} {marketplaceCopy.create.of} 3
          </span>
          <h2>{marketplaceCopy.create.title}</h2>
        </div>
        <button className='secondary-button' onClick={onCancel} type='button'>
          {marketplaceCopy.create.cancel}
        </button>
      </div>

      {requestError ? <p className='error-text'>{marketplaceErrorMessage(requestError)}</p> : null}

      {step === 1 ? (
        <div className='marketplace-form-grid'>
          <label>
            <span>{marketplaceCopy.create.name}</span>
            <input value={draft.name} onChange={(event) => update('name', event.target.value)} />
            <small>{marketplaceCopy.create.nameHint}</small>
            {errors.name ? <strong className='error-text'>{errors.name}</strong> : null}
          </label>
          <label>
            <span>{marketplaceCopy.create.slug}</span>
            <input
              value={draft.slug}
              onChange={(event) => {
                setSlugWasEdited(true);
                update('slug', event.target.value.toLowerCase());
              }}
            />
            <small>{marketplaceCopy.create.slugHint}</small>
            {errors.slug ? <strong className='error-text'>{errors.slug}</strong> : null}
          </label>
          <label>
            <span>{marketplaceCopy.create.category}</span>
            <select
              value={draft.categoryCode}
              onChange={(event) => update('categoryCode', event.target.value)}
            >
              {categoryOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{marketplaceCopy.create.enterprise}</span>
            <select
              value={draft.enterpriseId}
              onChange={(event) => update('enterpriseId', event.target.value)}
            >
              <option value=''>{marketplaceCopy.create.chooseEnterprise}</option>
              {enterprises.map((enterprise) => (
                <option key={enterprise.id} value={enterprise.id}>
                  {enterprise.displayName}
                </option>
              ))}
            </select>
            {errors.enterpriseId ? (
              <strong className='error-text'>{errors.enterpriseId}</strong>
            ) : null}
          </label>
          {hasMarketplacePermission(roles, 'enterprises:create') ? (
            <button
              className='secondary-button'
              onClick={() => setShowEnterpriseForm((current) => !current)}
              type='button'
            >
              {marketplaceCopy.create.enterpriseButton}
            </button>
          ) : null}
          {showEnterpriseForm ? (
            <div className='marketplace-inline-form'>
              <h3>{marketplaceCopy.create.enterpriseTitle}</h3>
              <label>
                <span>{marketplaceCopy.create.enterpriseName}</span>
                <input
                  value={enterpriseName}
                  onChange={(event) => {
                    setEnterpriseName(event.target.value);
                    setEnterpriseSlug(slugFromName(event.target.value));
                  }}
                />
                {errors.enterpriseName ? (
                  <strong className='error-text'>{errors.enterpriseName}</strong>
                ) : null}
              </label>
              <label>
                <span>{marketplaceCopy.create.enterpriseSlug}</span>
                <input
                  value={enterpriseSlug}
                  onChange={(event) => setEnterpriseSlug(event.target.value.toLowerCase())}
                />
                {errors.enterpriseSlug ? (
                  <strong className='error-text'>{errors.enterpriseSlug}</strong>
                ) : null}
              </label>
              <button
                className='secondary-button'
                disabled={saving}
                onClick={() => void createEnterprise()}
                type='button'
              >
                {marketplaceCopy.create.enterpriseSubmit}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className='marketplace-form-grid'>
          <label>
            <span>{marketplaceCopy.create.location}</span>
            <input
              value={draft.location}
              placeholder={marketplaceCopy.create.locationPlaceholder}
              onChange={(event) => update('location', event.target.value)}
            />
            {errors.location ? <strong className='error-text'>{errors.location}</strong> : null}
          </label>
          <label>
            <span>{marketplaceCopy.create.timeZone}</span>
            <select
              value={draft.timeZone}
              onChange={(event) => update('timeZone', event.target.value)}
            >
              {timeZones.map((zone) => (
                <option key={zone} value={zone}>
                  {marketplaceCopy.create.timeZones[
                    zone as keyof typeof marketplaceCopy.create.timeZones
                  ] ?? zone}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <div className='marketplace-form-grid'>
          <label>
            <span>{marketplaceCopy.create.defaultLanguage}</span>
            <select
              value={draft.defaultLocale}
              onChange={(event) => update('defaultLocale', event.target.value)}
            >
              {languages.map((language) => (
                <option key={language} value={language}>
                  {marketplaceCopy.languages[language]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{marketplaceCopy.create.theme}</span>
            <input
              value={draft.theme}
              placeholder={marketplaceCopy.create.themePlaceholder}
              onChange={(event) => update('theme', event.target.value)}
            />
            {errors.theme ? <strong className='error-text'>{errors.theme}</strong> : null}
          </label>
          <label>
            <span>{marketplaceCopy.create.description}</span>
            <textarea
              rows={5}
              value={draft.description}
              onChange={(event) => update('description', event.target.value)}
            />
            {errors.description ? (
              <strong className='error-text'>{errors.description}</strong>
            ) : null}
          </label>
          <label>
            <span>{marketplaceCopy.create.contribution}</span>
            <input
              value={draft.contribution}
              placeholder={marketplaceCopy.create.contributionPlaceholder}
              onChange={(event) => update('contribution', event.target.value)}
            />
            {errors.contribution ? (
              <strong className='error-text'>{errors.contribution}</strong>
            ) : null}
          </label>
        </div>
      ) : null}

      <div className='marketplace-form-actions'>
        {step > 1 ? (
          <button
            className='secondary-button'
            onClick={() => setStep((value) => value - 1)}
            type='button'
          >
            {marketplaceCopy.create.back}
          </button>
        ) : null}
        {step < 3 ? (
          <button className='primary-button' onClick={advance} type='button'>
            {marketplaceCopy.create.next}
          </button>
        ) : (
          <button
            className='primary-button'
            disabled={saving}
            onClick={() => void submit()}
            type='button'
          >
            {marketplaceCopy.create.submit}
          </button>
        )}
      </div>
    </section>
  );
}
