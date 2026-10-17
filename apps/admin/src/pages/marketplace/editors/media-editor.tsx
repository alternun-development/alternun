import { useMemo, useState } from 'react';
import type { AdminRole } from '../../../auth/oidc-client';
import {
  requestMarketplace,
  type MediaKind,
  type Project,
  type ProjectMedia,
} from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import { SectionMessage } from '../components';

const kinds: MediaKind[] = ['logo', 'cover', 'gallery_image', 'video', 'canva'];
const imageKinds = new Set<MediaKind>(['logo', 'cover', 'gallery_image']);
const supportedHosts: Partial<Record<MediaKind, readonly string[]>> = {
  video: [
    'youtube.com',
    'www.youtube.com',
    'youtu.be',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
    'vimeo.com',
    'www.vimeo.com',
    'player.vimeo.com',
  ],
  canva: ['canva.com', 'www.canva.com'],
};

export function toSafeMediaUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Invalid URL; treated as unsafe for DOM URL sinks.
  }
  return '';
}

export function mediaUrlError(kind: MediaKind, value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) {
      return marketplaceCopy.mediaEditor.httpsRequired;
    }
    const allowlist = supportedHosts[kind];
    if (allowlist && !allowlist.includes(url.hostname.toLowerCase())) {
      return marketplaceCopy.mediaEditor.hostNotAllowed;
    }
    return null;
  } catch {
    return marketplaceCopy.mediaEditor.httpsRequired;
  }
}

type Props = {
  project: Project;
  media: ProjectMedia[];
  roles: readonly AdminRole[];
  onChanged: (message: string) => void;
};

export function MediaEditor({ project, media, roles, onChanged }: Props): JSX.Element {
  const [kind, setKind] = useState<MediaKind>('cover');
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [error, setError] = useState<unknown>();
  const [fieldError, setFieldError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<ProjectMedia>();
  const canWrite = hasMarketplacePermission(roles, 'project_media:write');
  const canModerate = hasMarketplacePermission(roles, 'project_media:moderate');
  const active = useMemo(
    () => media.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [media]
  );
  const gallery = active.filter((item) => item.kind === 'gallery_image');
  const validationMessage = url ? mediaUrlError(kind, url) : null;
  const previewUrl = toSafeMediaUrl(url);

  async function add(): Promise<void> {
    const urlError = mediaUrlError(kind, url);
    const altError =
      imageKinds.has(kind) && !altText.trim() ? marketplaceCopy.mediaEditor.altRequired : null;
    setFieldError(urlError ?? altError ?? '');
    if (urlError ?? altError) return;
    setSaving(true);
    setError(undefined);
    try {
      await requestMarketplace<ProjectMedia>(`/v1/admin/projects/${project.id}/media`, {
        method: 'POST',
        body: {
          kind,
          url,
          ...(imageKinds.has(kind) ? { altText: { [project.defaultLocale]: altText.trim() } } : {}),
          ...(kind === 'gallery_image' ? { sortOrder: gallery.length } : {}),
        },
      });
      setUrl('');
      setAltText('');
      onChanged(marketplaceCopy.mediaEditor.added);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function move(item: ProjectMedia, direction: -1 | 1): Promise<void> {
    const index = gallery.findIndex((entry) => entry.id === item.id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= gallery.length) return;
    const reordered = [...gallery];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    setSaving(true);
    setError(undefined);
    try {
      await requestMarketplace<ProjectMedia[]>(`/v1/admin/projects/${project.id}/media/order`, {
        method: 'PUT',
        body: { items: reordered.map((entry, sortOrder) => ({ id: entry.id, sortOrder })) },
      });
      onChanged(marketplaceCopy.mediaEditor.reordered);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(): Promise<void> {
    if (!removing) return;
    setSaving(true);
    setError(undefined);
    try {
      await requestMarketplace<void>(`/v1/admin/projects/${project.id}/media/${removing.id}`, {
        method: 'DELETE',
      });
      setRemoving(undefined);
      onChanged(marketplaceCopy.mediaEditor.removed);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='panel'>
      <h3>{marketplaceCopy.projectDetail.media.heading}</h3>
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      {!active.length ? (
        <SectionMessage>{marketplaceCopy.projectDetail.media.empty}</SectionMessage>
      ) : (
        <div className='marketplace-media-grid'>
          {active.map((item) => {
            const label = marketplaceCopy.mediaEditor.kinds[item.kind];
            const alt =
              item.altText[project.defaultLocale] ||
              marketplaceCopy.projectDetail.media.imageFallback;
            const safeItemUrl = toSafeMediaUrl(item.url);
            const safeItemLink = toSafeMediaUrl(item.embedUrl ?? item.url);
            const galleryIndex = gallery.findIndex((entry) => entry.id === item.id);
            return (
              <article className='metric-card marketplace-media-card' key={item.id}>
                <h4>{label}</h4>
                {imageKinds.has(item.kind) && safeItemUrl ? (
                  <img src={safeItemUrl} alt={alt} />
                ) : null}
                {imageKinds.has(item.kind) ? (
                  <p>
                    <strong>{marketplaceCopy.projectDetail.media.altText}:</strong> {alt}
                  </p>
                ) : safeItemLink ? (
                  <a className='inline-link' href={safeItemLink} rel='noreferrer' target='_blank'>
                    {item.kind === 'video'
                      ? marketplaceCopy.projectDetail.media.openVideo
                      : marketplaceCopy.projectDetail.media.openCanva}
                  </a>
                ) : null}
                {item.kind === 'gallery_image' && canWrite ? (
                  <div className='marketplace-compact-actions'>
                    <button
                      aria-label={marketplaceCopy.mediaEditor.moveUp}
                      className='secondary-button'
                      disabled={saving || galleryIndex === 0}
                      onClick={() => void move(item, -1)}
                      type='button'
                    >
                      {marketplaceCopy.mediaEditor.moveUp}
                    </button>
                    <button
                      aria-label={marketplaceCopy.mediaEditor.moveDown}
                      className='secondary-button'
                      disabled={saving || galleryIndex === gallery.length - 1}
                      onClick={() => void move(item, 1)}
                      type='button'
                    >
                      {marketplaceCopy.mediaEditor.moveDown}
                    </button>
                  </div>
                ) : null}
                {canModerate ? (
                  <button
                    className='secondary-button'
                    onClick={() => setRemoving(item)}
                    type='button'
                  >
                    {marketplaceCopy.mediaEditor.remove}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {canWrite ? (
        <div className='marketplace-inline-form'>
          <h4>{marketplaceCopy.mediaEditor.addTitle}</h4>
          <label>
            <span>{marketplaceCopy.mediaEditor.type}</span>
            <select value={kind} onChange={(event) => setKind(event.target.value as MediaKind)}>
              {kinds.map((item) => (
                <option key={item} value={item}>
                  {marketplaceCopy.mediaEditor.kinds[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{marketplaceCopy.mediaEditor.url}</span>
            <input value={url} onChange={(event) => setUrl(event.target.value)} />
            {validationMessage ? <strong className='error-text'>{validationMessage}</strong> : null}
          </label>
          {imageKinds.has(kind) ? (
            <label>
              <span>{marketplaceCopy.mediaEditor.altText}</span>
              <input value={altText} onChange={(event) => setAltText(event.target.value)} />
            </label>
          ) : null}
          {previewUrl && !validationMessage && imageKinds.has(kind) ? (
            <figure className='marketplace-preview'>
              <figcaption>{marketplaceCopy.mediaEditor.preview}</figcaption>
              <img
                src={previewUrl}
                alt={altText || marketplaceCopy.projectDetail.media.imageFallback}
              />
            </figure>
          ) : null}
          {fieldError ? <strong className='error-text'>{fieldError}</strong> : null}
          <button
            className='primary-button'
            disabled={saving}
            onClick={() => void add()}
            type='button'
          >
            {marketplaceCopy.mediaEditor.add}
          </button>
        </div>
      ) : (
        <p>{marketplaceCopy.permissions.editProject}</p>
      )}

      {removing ? (
        <div aria-modal='true' className='marketplace-confirmation' role='dialog'>
          <h4>{marketplaceCopy.mediaEditor.removeTitle}</h4>
          <p>{marketplaceCopy.mediaEditor.removeEffect}</p>
          <div className='marketplace-form-actions'>
            <button
              className='secondary-button'
              onClick={() => setRemoving(undefined)}
              type='button'
            >
              {marketplaceCopy.actions.cancel}
            </button>
            <button
              className='primary-button'
              disabled={saving}
              onClick={() => void remove()}
              type='button'
            >
              {marketplaceCopy.mediaEditor.removeConfirm}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
