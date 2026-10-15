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
  common: {
    loading: 'Loading…',
    retry: 'Retry',
    backToProjects: 'Back to projects',
    openProject: 'Open project',
    notAvailable: 'Not available',
    complete: 'Complete',
    needsContent: 'Needs content',
    fulfilled: 'Done',
    missing: 'Missing',
  },
  projectList: {
    eyebrow: 'Marketplace',
    title: 'My projects',
    intro: 'Find a project and review what guests will see.',
    searchLabel: 'Search projects by name',
    searchPlaceholder: 'Search by project name',
    empty: 'You do not have any projects yet.',
    noResults: 'No projects match your search.',
    coverFallback: 'No cover image yet',
    enterpriseFallback: 'Enterprise information unavailable',
  },
  projectDetail: {
    eyebrow: 'Project',
    tabsLabel: 'Project sections',
    tabs: {
      overview: 'Overview',
      content: 'Content',
      media: 'Media',
      activities: 'Activities',
      team: 'Team',
    },
    overview: {
      heading: 'Project overview',
      enterprise: 'Enterprise',
      category: 'Category',
      country: 'Country',
      timeZone: 'Time zone',
      defaultLanguage: 'Default language',
    },
    content: {
      heading: 'Project content',
      intro: 'Review the information available in each language.',
      languageSelector: 'Choose a language',
      title: 'Name',
      location: 'Location',
      theme: 'Theme',
      description: 'Description',
      waysToContribute: 'Ways to contribute',
      empty: 'No content is available in this language yet.',
    },
    media: {
      heading: 'Media',
      empty: 'No media has been added to this project yet.',
      logo: 'Logo',
      cover: 'Cover',
      gallery: 'Gallery',
      video: 'Video',
      canva: 'Canva presentation',
      openVideo: 'Open video',
      openCanva: 'Open Canva presentation',
      altText: 'Alternative text',
      imageFallback: 'Project image',
    },
    activities: {
      heading: 'Activities',
      empty: 'No activities have been added yet.',
      points: 'AIRS points',
    },
    team: {
      heading: 'Team',
      empty: 'No team members are assigned to this project yet.',
      member: 'Team member',
      roles: {
        partner_operator: 'Project admin',
        sub_admin: 'Sub-admin',
        partner_readonly: 'Read-only',
      },
    },
    readiness: {
      heading: 'Ready to publish?',
      intro: 'Complete these essentials before publishing the project.',
      title: 'Project name',
      description: 'Project description',
      logo: 'Logo',
      cover: 'Cover image',
      activity: 'At least one activity',
    },
  },
  enterpriseDetail: {
    eyebrow: 'Enterprise',
    heading: 'Enterprise overview',
    projectsHeading: 'Projects',
    projectsEmpty: 'This enterprise has no projects yet.',
    status: 'Status',
    country: 'Country',
    website: 'Website',
    openWebsite: 'Open website',
  },
  status: {
    draft: 'Draft',
    published: 'Published',
    paused: 'Paused',
    archived: 'Archived',
    active: 'Active',
    revoked: 'Revoked',
  },
  languages: {
    es: 'Spanish',
    en: 'English',
    th: 'Thai',
  },
  categories: {
    hospitality_ecotourism: 'Hospitality and ecotourism',
    conservation: 'Conservation',
    productive_enterprise: 'Productive enterprise',
    regenerative_agriculture: 'Regenerative agriculture',
    community: 'Community',
    education: 'Education',
    other: 'Other',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    unauthorized: 'Your session has expired. Please sign in again.',
    sectionForbidden: "You don't have access to this section.",
    notFound: 'This information could not be found.',
    conflict: 'This change conflicts with the current information. Please refresh and try again.',
    invalid: 'Some information is incomplete or invalid.',
    ENTERPRISE_SCOPE_DENIED: "You don't have access to this enterprise.",
    PROJECT_SCOPE_DENIED: "You don't have access to this project.",
    PERMISSION_DENIED: "You don't have permission to do that.",
    ADMIN_AUTH_REQUIRED: 'Your session has expired. Please sign in again.',
    USER_AUTH_REQUIRED: 'Your session has expired. Please sign in again.',
    VALIDATION_FAILED: 'Some information is incomplete or invalid.',
    INVALID_LOCALE: 'This language is not supported.',
    INVALID_PAGINATION: 'The requested page is not available.',
    ROLE_ESCALATION_DENIED: "You can't assign that level of access.",
    PROTECTED_FIELD_WRITE_DENIED: "You can't change that protected information.",
    SELF_MEMBERSHIP_CHANGE_DENIED: "You can't change your own team access.",
    ENTERPRISE_NOT_FOUND: 'This enterprise could not be found.',
    PROJECT_NOT_FOUND: 'This project could not be found.',
    MEDIA_NOT_FOUND: 'This media item could not be found.',
    ACTIVITY_NOT_FOUND: 'This activity could not be found.',
    COMPLETION_NOT_FOUND: 'This completion could not be found.',
    MEMBERSHIP_NOT_FOUND: 'This team member could not be found.',
    ENTERPRISE_SLUG_CONFLICT: 'An enterprise already uses that address.',
    ENTERPRISE_NOT_ACTIVE: 'The enterprise must be active before continuing.',
    PROJECT_SLUG_CONFLICT: 'A project already uses that address.',
    PROJECT_SLUG_IMMUTABLE: 'The project address cannot change after publication.',
    PROJECT_STATUS_TRANSITION_INVALID: 'This project status change is not available.',
    PRIMARY_ENTERPRISE_REQUIRED: 'Choose an active primary enterprise before publishing.',
    MEDIA_KIND_CONFLICT: 'This media slot is already in use.',
    ACTIVITY_CODE_CONFLICT: 'An activity with this name already exists.',
    ACTIVITY_STATUS_TRANSITION_INVALID: 'This activity status change is not available.',
    COMPLETION_DUPLICATE: 'This completion has already been recorded.',
    COMPLETION_STATUS_INVALID: 'This completion can no longer be changed.',
    ACTIVITY_NOT_AWARDABLE: 'This activity cannot award points right now.',
    ACTIVITY_NOT_STARTED: 'This activity has not started yet.',
    ACTIVITY_ENDED: 'This activity has already ended.',
    ACTIVITY_AWARD_LIMIT_REACHED: 'The points limit for this activity has been reached.',
    AIRS_ALREADY_AWARDED: 'Points have already been awarded for this completion.',
    AIRS_ALREADY_REVERSED: 'These points have already been reversed.',
    AIRS_NOT_AWARDED: 'There are no awarded points to reverse.',
    MEMBERSHIP_CONFLICT: 'This person already has overlapping access.',
    MEDIA_ORDER_INVALID: 'The gallery order is incomplete or invalid.',
    DEFAULT_TRANSLATION_REQUIRED: 'Complete the default language before continuing.',
    PROJECT_NOT_PUBLISHABLE: 'Complete the publishing checklist before publishing.',
    CATEGORY_UNSUPPORTED: 'Choose one of the available project categories.',
    MEDIA_URL_INVALID: 'Use a valid secure link for this media.',
    MEDIA_HOST_NOT_ALLOWED: 'This media provider is not supported.',
    MEDIA_ALT_REQUIRED: 'Add alternative text for this image.',
    STATUS_REASON_REQUIRED: 'Add a short reason for this status change.',
    REVERSAL_REASON_REQUIRED: 'Add a short reason for reversing these points.',
    AIRS_AMOUNT_OUT_OF_RANGE: 'The points amount is outside the allowed range.',
    USER_NOT_ELIGIBLE: 'This person is not eligible for these points.',
    REVOCATION_REASON_REQUIRED: 'Add a short reason for removing this access.',
    MEMBERSHIP_INPUT_INVALID: 'Check the team role and scope, then try again.',
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
  if (status === 401) return marketplaceCopy.errors.unauthorized;
  if (status === 403) return marketplaceCopy.errors.sectionForbidden;
  if (status === 404) return marketplaceCopy.errors.notFound;
  if (status === 409) return marketplaceCopy.errors.conflict;
  if (status === 400 || status === 422) return marketplaceCopy.errors.invalid;
  return marketplaceCopy.errors.generic;
}
