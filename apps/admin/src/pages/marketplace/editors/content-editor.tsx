import { useEffect, useState } from 'react';
import type { AdminRole } from '../../../auth/oidc-client';
import {
  requestMarketplace,
  type Project,
  type ProjectContentBlock,
} from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import { isProjectLocaleComplete } from '../../../marketplace/project-detail-model';
import { SectionMessage } from '../components';

const locales = ['es', 'en', 'th'] as const;
const emptyContent: ProjectContentBlock = {
  title: '',
  location: '',
  theme: '',
  description: '',
  waysToContribute: [],
};

type Props = {
  project: Project;
  roles: readonly AdminRole[];
  onSaved: () => void;
};

export function ContentEditor({ project, roles, onSaved }: Props): JSX.Element {
  const [locale, setLocale] = useState<(typeof locales)[number]>(
    locales.includes(project.defaultLocale as (typeof locales)[number])
      ? (project.defaultLocale as (typeof locales)[number])
      : 'es'
  );
  const [content, setContent] = useState<Record<string, ProjectContentBlock>>(project.content);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const canEdit = hasMarketplacePermission(roles, 'projects:update');

  useEffect(() => setContent(project.content), [project.content]);
  const current = content[locale] ?? emptyContent;

  function update(field: keyof ProjectContentBlock, value: string | string[]): void {
    setContent((existing) => ({
      ...existing,
      [locale]: { ...current, [field]: value },
    }));
    setFieldErrors((existing) => ({ ...existing, [field]: '' }));
    setDirty(true);
    setSuccess(false);
  }

  async function save(): Promise<void> {
    const errors: Record<string, string> = {};
    for (const field of ['title', 'location', 'theme', 'description'] as const) {
      if (!current[field].trim()) errors[field] = marketplaceCopy.edit.required;
    }
    if (!current.waysToContribute.some((item) => item.trim())) {
      errors.waysToContribute = marketplaceCopy.create.validation.contribution;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setSaving(true);
    setError(undefined);
    try {
      await requestMarketplace<Project>(`/v1/admin/projects/${project.id}`, {
        method: 'PATCH',
        body: { content },
      });
      setDirty(false);
      setSuccess(true);
      onSaved();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='panel'>
      <h3>{marketplaceCopy.projectDetail.content.heading}</h3>
      <p>{marketplaceCopy.projectDetail.content.intro}</p>
      <div
        aria-label={marketplaceCopy.projectDetail.content.languageSelector}
        className='marketplace-language-tabs'
        role='tablist'
      >
        {locales.map((item) => {
          const complete = isProjectLocaleComplete({ ...project, content }, item);
          return (
            <button
              aria-selected={locale === item}
              className={locale === item ? 'is-active' : ''}
              key={item}
              onClick={() => setLocale(item)}
              role='tab'
              type='button'
            >
              <span>{marketplaceCopy.languages[item]}</span>
              <small>
                {complete ? marketplaceCopy.common.complete : marketplaceCopy.common.needsContent}
              </small>
            </button>
          );
        })}
      </div>

      {!project.content[locale] && !canEdit ? (
        <SectionMessage>{marketplaceCopy.projectDetail.content.empty}</SectionMessage>
      ) : (
        <div className='marketplace-form-grid'>
          <label>
            <span>{marketplaceCopy.projectDetail.content.title}</span>
            <input
              disabled={!canEdit}
              value={current.title}
              onChange={(event) => update('title', event.target.value)}
            />
            {fieldErrors.title ? <strong className='error-text'>{fieldErrors.title}</strong> : null}
          </label>
          <label>
            <span>{marketplaceCopy.projectDetail.content.location}</span>
            <input
              disabled={!canEdit}
              value={current.location}
              onChange={(event) => update('location', event.target.value)}
            />
            {fieldErrors.location ? (
              <strong className='error-text'>{fieldErrors.location}</strong>
            ) : null}
          </label>
          <label>
            <span>{marketplaceCopy.projectDetail.content.theme}</span>
            <input
              disabled={!canEdit}
              value={current.theme}
              onChange={(event) => update('theme', event.target.value)}
            />
            {fieldErrors.theme ? <strong className='error-text'>{fieldErrors.theme}</strong> : null}
          </label>
          <label>
            <span>{marketplaceCopy.projectDetail.content.description}</span>
            <textarea
              disabled={!canEdit}
              rows={6}
              value={current.description}
              onChange={(event) => update('description', event.target.value)}
            />
            {fieldErrors.description ? (
              <strong className='error-text'>{fieldErrors.description}</strong>
            ) : null}
          </label>
          <label>
            <span>{marketplaceCopy.projectDetail.content.waysToContribute}</span>
            <textarea
              disabled={!canEdit}
              rows={4}
              value={current.waysToContribute.join('\n')}
              onChange={(event) =>
                update(
                  'waysToContribute',
                  event.target.value.split('\n').filter((item) => item.length > 0)
                )
              }
            />
            <small>{marketplaceCopy.edit.contributionHint}</small>
            {fieldErrors.waysToContribute ? (
              <strong className='error-text'>{fieldErrors.waysToContribute}</strong>
            ) : null}
          </label>
        </div>
      )}

      {!canEdit ? <p>{marketplaceCopy.permissions.editProject}</p> : null}
      {dirty ? <p className='marketplace-unsaved'>{marketplaceCopy.edit.unsaved}</p> : null}
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      {success ? (
        <p className='marketplace-success' role='status'>
          {marketplaceCopy.edit.success}
        </p>
      ) : null}
      {canEdit ? (
        <button
          className='primary-button'
          disabled={!dirty || saving}
          onClick={() => void save()}
          type='button'
        >
          {saving ? marketplaceCopy.edit.saving : marketplaceCopy.edit.save}
        </button>
      ) : null}
    </section>
  );
}
