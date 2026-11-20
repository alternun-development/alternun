/** A medal of a project's catalog: custom art and name, chosen when reporting Airs. */
export interface ProjectMedalRecord {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  /** Honor award this medal also gives when it is awarded. */
  honorRecipeId: string | null;
  createdAt: string;
}

export interface CreateProjectMedalInput {
  name: string;
  description?: string;
  imageUrl: string;
  sortOrder?: number;
  honorRecipeId?: string | null;
}

export interface UpdateProjectMedalInput {
  name?: string;
  description?: string | null;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  honorRecipeId?: string | null;
}
