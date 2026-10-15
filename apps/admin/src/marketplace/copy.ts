export const marketplaceCopy = {
  navigation: {
    title: 'Projects',
    description: 'Your projects and their public information.',
  },
  enterprisesResource: {
    title: 'Enterprises',
    description: 'The businesses responsible for your projects.',
    empty: 'No enterprises are available yet.',
  },
  projectsResource: {
    title: 'Projects',
    description: 'Review the projects your team manages.',
    empty: 'No projects are available yet.',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    sectionForbidden: "You don't have access to this section.",
    ENTERPRISE_SCOPE_DENIED: "You don't have access to this enterprise.",
    PROJECT_SCOPE_DENIED: "You don't have access to this project.",
    PERMISSION_DENIED: "You don't have permission to do that.",
    ENTERPRISE_NOT_FOUND: 'This enterprise could not be found.',
    PROJECT_NOT_FOUND: 'This project could not be found.',
    ACTIVITY_NOT_FOUND: 'This activity could not be found.',
    MEMBERSHIP_NOT_FOUND: 'This team member could not be found.',
    MARKETPLACE_UNAVAILABLE: 'This information is temporarily unavailable. Please try again.',
  },
} as const;

type MarketplaceErrorCode = keyof typeof marketplaceCopy.errors;

export function marketplaceErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return marketplaceCopy.errors.generic;
  const candidate = error as {
    code?: unknown;
    reasonCode?: unknown;
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown; data?: { code?: unknown; reasonCode?: unknown } };
  };
  const rawCode =
    candidate.code ??
    candidate.reasonCode ??
    candidate.response?.data?.code ??
    candidate.response?.data?.reasonCode;
  if (typeof rawCode === 'string' && rawCode in marketplaceCopy.errors) {
    return marketplaceCopy.errors[rawCode as MarketplaceErrorCode];
  }
  const status = candidate.status ?? candidate.statusCode ?? candidate.response?.status;
  return status === 403 ? marketplaceCopy.errors.sectionForbidden : marketplaceCopy.errors.generic;
}
