import type { Enterprise, Project } from '../../marketplace/api';

export type EnterpriseListData = {
  enterprises: Enterprise[];
  projects: Project[];
};

export type EnterpriseCreateFormProps = {
  onCancel: () => void;
  onCreated: (enterprise: Enterprise) => void;
};
