import {
  MarketplaceRequestError,
  type Enterprise,
  type Project,
  type ProjectActivity,
  type ProjectMedia,
  type ProjectMembership,
} from './api';

export type MarketplaceGet = <T>(path: string) => Promise<T>;
export type SectionResult<T> =
  | { kind: 'success'; data: T }
  | { kind: 'forbidden' }
  | { kind: 'error'; error: unknown };

export type ProjectDetailSnapshot = {
  project: Project;
  enterprise: SectionResult<Enterprise>;
  media: SectionResult<ProjectMedia[]>;
  activities: SectionResult<ProjectActivity[]>;
  memberships: SectionResult<ProjectMembership[]>;
};

async function section<T>(operation: Promise<T>): Promise<SectionResult<T>> {
  try {
    return { kind: 'success', data: await operation };
  } catch (error) {
    return error instanceof MarketplaceRequestError && error.status === 403
      ? { kind: 'forbidden' }
      : { kind: 'error', error };
  }
}

export async function loadProjectDetail(
  get: MarketplaceGet,
  projectId: string
): Promise<ProjectDetailSnapshot> {
  const project = await get<Project>(`/v1/admin/projects/${encodeURIComponent(projectId)}`);
  const encodedProjectId = encodeURIComponent(projectId);
  const [enterprise, media, activities, memberships] = await Promise.all([
    section(get<Enterprise>(`/v1/admin/enterprises/${encodeURIComponent(project.enterpriseId)}`)),
    section(get<ProjectMedia[]>(`/v1/admin/projects/${encodedProjectId}/media`)),
    section(get<ProjectActivity[]>(`/v1/admin/projects/${encodedProjectId}/activities`)),
    section(
      get<ProjectMembership[]>(
        `/v1/admin/project-memberships?projectId=${encodeURIComponent(projectId)}`
      )
    ),
  ]);
  return { project, enterprise, media, activities, memberships };
}

export function isProjectLocaleComplete(project: Project, locale: string): boolean {
  const content = project.content[locale];
  return Boolean(
    content?.title?.trim() &&
      content.location?.trim() &&
      content.theme?.trim() &&
      content.description?.trim() &&
      content.waysToContribute?.some((item) => item.trim())
  );
}

export type ReadinessKey = 'title' | 'description' | 'logo' | 'cover' | 'activity';

export function projectReadiness(
  project: Project,
  media: readonly ProjectMedia[],
  activities: readonly ProjectActivity[]
): Array<{ key: ReadinessKey; complete: boolean }> {
  const content = project.content[project.defaultLocale];
  return [
    { key: 'title', complete: Boolean(content?.title?.trim()) },
    { key: 'description', complete: Boolean(content?.description?.trim()) },
    { key: 'logo', complete: media.some((item) => item.isActive && item.kind === 'logo') },
    { key: 'cover', complete: media.some((item) => item.isActive && item.kind === 'cover') },
    { key: 'activity', complete: activities.length > 0 },
  ];
}
