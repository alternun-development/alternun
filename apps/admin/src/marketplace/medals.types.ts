// Shapes of the project medal endpoints (issue #249 B17). They mirror
// apps/api/src/modules/marketplace/medal.types.ts.

export type ProjectMedal = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

export type NewMedalValues = {
  name: string;
  description: string;
  imageUrl: string;
};

export type NewMedalErrors = {
  name?: string;
  description?: string;
  imageUrl?: string;
};
