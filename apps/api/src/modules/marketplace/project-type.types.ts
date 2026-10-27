/** A commerce type of project (hotel, restaurant, ...), separate from the impact category. */
export interface ProjectTypeRecord {
  code: string;
  /** Localized names; English is always present. */
  labels: Record<string, string>;
  requiresDocumentNumber: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface CreateProjectTypeInput {
  code: string;
  labels: Record<string, string>;
  requiresDocumentNumber: boolean;
  sortOrder?: number;
}

export interface UpdateProjectTypeInput {
  labels?: Record<string, string>;
  requiresDocumentNumber?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

// PUT /v1/admin/projects/:projectId/type
export interface SetProjectTypeResponse {
  projectId: string;
  projectTypeCode: string | null;
  requiresDocumentNumber: boolean;
}
