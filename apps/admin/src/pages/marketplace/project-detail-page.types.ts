import type { ReactNode } from 'react';
import type { AdminRole } from '../../auth/oidc-client';
import type {
  Project,
  ProjectActivity,
  ProjectMedia,
  ProjectMembership,
} from '../../marketplace/api';
import type { ProjectDetailSnapshot, SectionResult } from '../../marketplace/project-detail-model';

export type ProjectDetailTab =
  | 'overview'
  | 'content'
  | 'media'
  | 'activities'
  | 'participants'
  | 'airsReports'
  | 'comments'
  | 'team'
  | 'history';

export type SectionStateProps<T> = {
  result: SectionResult<T>;
  empty: (data: T) => boolean;
  onRetry: () => void;
  children: (data: T) => ReactNode;
};

export type OverviewTabProps = {
  snapshot: ProjectDetailSnapshot;
  roles: readonly AdminRole[];
  onChanged: (message: string) => void;
};

export type ContentTabProps = {
  project: Project;
};

export type MediaItemsProps = {
  project: Project;
  media: ProjectMedia[];
};

export type ActivitiesProps = {
  activities: ProjectActivity[];
};

export type TeamProps = {
  memberships: ProjectMembership[];
};
