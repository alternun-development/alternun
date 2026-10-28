import { marketplaceCopy } from './copy';
import type { NewMedalErrors, NewMedalValues, ProjectMedal } from './medals.types';

export const MEDAL_NAME_MAX = 80;
export const MEDAL_DESCRIPTION_MAX = 300;

export const emptyNewMedal: NewMedalValues = { name: '', description: '', imageUrl: '' };

export function medalsPath(projectId: string): string {
  return `/v1/admin/projects/${encodeURIComponent(projectId)}/medals`;
}

export function medalPath(projectId: string, medalId: string): string {
  return `${medalsPath(projectId)}/${encodeURIComponent(medalId)}`;
}

/** A plain https address; the API also checks that the host is allowed for project images. */
export function isValidMedalImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'https:' && !url.username && !url.password && value.trim().length <= 2048
    );
  } catch {
    return false;
  }
}

export function validateNewMedal(values: NewMedalValues): NewMedalErrors {
  const copy = marketplaceCopy.medals.errors;
  const errors: NewMedalErrors = {};
  const name = values.name.trim();
  if (!name || name.length > MEDAL_NAME_MAX) errors.name = copy.name;
  if (values.description.trim().length > MEDAL_DESCRIPTION_MAX)
    errors.description = copy.description;
  if (!isValidMedalImageUrl(values.imageUrl)) errors.imageUrl = copy.imageUrl;
  return errors;
}

export function buildCreateMedalBody(values: NewMedalValues): Record<string, string> {
  const description = values.description.trim();
  return {
    name: values.name.trim(),
    ...(description ? { description } : {}),
    imageUrl: values.imageUrl.trim(),
  };
}

/** Only active medals can be picked in a report. */
export function pickableMedals(medals: readonly ProjectMedal[]): ProjectMedal[] {
  return medals.filter((medal) => medal.isActive);
}

export function medalName(medals: readonly ProjectMedal[], medalId: string): string | null {
  return medals.find((medal) => medal.id === medalId)?.name ?? null;
}
