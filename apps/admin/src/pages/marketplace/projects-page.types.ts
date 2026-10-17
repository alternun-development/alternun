import type { Enterprise, Project } from '../../marketplace/api';

export type ProjectListData = {
  projects: Project[];
  enterprises: Enterprise[];
};
