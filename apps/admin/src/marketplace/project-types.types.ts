// Shapes of the project type endpoints (issue #249 B18). They mirror
// apps/api/src/modules/marketplace/project-type.types.ts.

export type ProjectType = {
  code: string;
  labels: Record<string, string>;
  requiresDocumentNumber: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type SetProjectTypeResponse = {
  projectId: string;
  projectTypeCode: string | null;
  requiresDocumentNumber: boolean;
};

export type NewProjectTypeValues = {
  nameEn: string;
  nameEs: string;
  requiresDocumentNumber: boolean;
};

export type NewProjectTypeErrors = {
  nameEn?: string;
  nameEs?: string;
};

export type CreateProjectTypeBody = {
  code: string;
  labels: Record<string, string>;
  requiresDocumentNumber: boolean;
};
