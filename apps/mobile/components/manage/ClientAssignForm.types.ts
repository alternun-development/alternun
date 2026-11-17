import type { ClientField } from '../../utils/projectClients';

/** Airs fields of the add-client and assign forms, as typed. */
export interface AirsValues {
  amount: string;
  concept: string;
  documentNumber: string;
}

/** Why an assignment failed: a message plus per-field problems from the API. */
export interface AssignFailure {
  message: string;
  fields: Partial<Record<ClientField, string>>;
}
