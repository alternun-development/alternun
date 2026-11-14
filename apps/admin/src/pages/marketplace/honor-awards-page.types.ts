import type { Enterprise, Project } from '../../marketplace/api';
import type {
  HonorAwardGrant,
  HonorAwardRecipe,
  HonorAwardRecipeErrors,
  HonorAwardRecipeValues,
} from '../../marketplace/honor-awards.types';

export type HonorAwardsData = {
  recipes: HonorAwardRecipe[];
  projects: Project[];
  enterprises: Enterprise[];
};

export type HonorAwardsState =
  | { kind: 'loading' }
  | { kind: 'success'; data: HonorAwardsData }
  | { kind: 'error'; error: unknown };

export type HonorAwardRecipeFormProps = {
  values: HonorAwardRecipeValues;
  errors: HonorAwardRecipeErrors;
  editing: boolean;
  busy: boolean;
  projects: Project[];
  enterprises: Enterprise[];
  onChange: (values: HonorAwardRecipeValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export type HonorAwardGrantsPanelProps = {
  recipe: HonorAwardRecipe;
  enterprises: Enterprise[];
  onMessage: (message: string) => void;
};

export type HonorAwardGrantsState =
  | { kind: 'loading' }
  | { kind: 'success'; data: HonorAwardGrant[] }
  | { kind: 'error'; error: unknown };

/** Recipe fields edited with a text input or textarea. */
export type TextField = Exclude<
  keyof HonorAwardRecipeValues,
  'kind' | 'tier' | 'audience' | 'projectId' | 'partnerEnterpriseId'
>;
