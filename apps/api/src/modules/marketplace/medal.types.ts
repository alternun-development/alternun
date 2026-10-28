/** A medal of a project's catalog: custom art and name, chosen when reporting Airs. */
export interface ProjectMedalRecord {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CreateProjectMedalInput {
  name: string;
  description?: string;
  imageUrl: string;
  sortOrder?: number;
}

export interface UpdateProjectMedalInput {
  name?: string;
  description?: string | null;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}
