import { marketplaceCopy } from './copy';
import type {
  CreateProjectTypeBody,
  NewProjectTypeErrors,
  NewProjectTypeValues,
  ProjectType,
} from './project-types.types';

export const projectTypesPath = '/v1/admin/project-types';

export function projectTypePath(code: string): string {
  return `${projectTypesPath}/${encodeURIComponent(code)}`;
}

export function projectTypeAssignmentPath(projectId: string): string {
  return `/v1/admin/projects/${encodeURIComponent(projectId)}/type`;
}

export const emptyNewProjectType: NewProjectTypeValues = {
  nameEn: '',
  nameEs: '',
  requiresDocumentNumber: true,
};

// Mirrors the API limits; the server stays the authority.
export const PROJECT_TYPE_NAME_MAX = 120;

/** `Boutique hotel` becomes `boutique_hotel`: letters and digits, underscores, at least 3 long. */
export function projectTypeCodeFromName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base) return '';
  const startsWithLetter = /^[a-z]/.test(base) ? base : `type_${base}`;
  return startsWithLetter.slice(0, 64);
}

export function validateNewProjectType(values: NewProjectTypeValues): NewProjectTypeErrors {
  const copy = marketplaceCopy.projectTypes.errors;
  const errors: NewProjectTypeErrors = {};
  const english = values.nameEn.trim();
  const code = projectTypeCodeFromName(english);
  if (!english || english.length > PROJECT_TYPE_NAME_MAX || code.length < 3) {
    errors.nameEn = copy.nameEn;
  }
  if (values.nameEs.trim().length > PROJECT_TYPE_NAME_MAX) errors.nameEs = copy.nameEs;
  return errors;
}

export function buildCreateProjectTypeBody(values: NewProjectTypeValues): CreateProjectTypeBody {
  const english = values.nameEn.trim();
  const spanish = values.nameEs.trim();
  return {
    code: projectTypeCodeFromName(english),
    labels: { en: english, ...(spanish ? { es: spanish } : {}) },
    requiresDocumentNumber: values.requiresDocumentNumber,
  };
}

/** The name in the wanted language, falling back to English and then to the code. */
export function projectTypeLabel(
  type: Pick<ProjectType, 'code' | 'labels'>,
  locale = 'en'
): string {
  return type.labels[locale] ?? type.labels.en ?? type.code;
}

/** Active types first (by their order), retired ones last. */
export function sortProjectTypes(types: readonly ProjectType[]): ProjectType[] {
  return [...types].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.sortOrder - b.sortOrder || a.code.localeCompare(b.code);
  });
}
