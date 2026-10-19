import type { Enterprise, Project } from '../../marketplace/api';

export type EnterpriseDetail = {
  enterprise: Enterprise;
  projects: Project[];
};
