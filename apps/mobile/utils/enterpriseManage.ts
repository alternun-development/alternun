import { resolveMobileApiBaseUrl } from './runtimeConfig';
import {
  ManageRequestError,
  uploadProblem,
  type ManageRole,
  type TeamMember,
} from './projectManage';

/** Client for the in-app "Manage enterprise" API (/v1/me/enterprises/:id/manage, ...). */

export interface EnterpriseManageCapabilities {
  editInfo: boolean;
  images: boolean;
  products: boolean;
  team: boolean;
  clients?: boolean;
  editClients?: boolean;
  assignAirs?: boolean;
}

export interface ManagedEnterprise {
  id: string;
  updatedAt?: string;
  slug: string;
  displayName: string;
  sector?: string | null;
  description?: string | null;
  location?: Partial<Record<'municipality' | 'department' | 'address' | 'coverage', string>>;
  publicContact?: Partial<
    Record<'web' | 'email' | 'phone' | 'whatsapp' | 'instagram' | 'facebook', string>
  >;
  logoUrl?: string | null;
  bannerUrl?: string | null;
}

export interface EnterpriseManageOverview {
  enterprise: ManagedEnterprise;
  roles: string[];
  isGlobalAdmin: boolean;
  can: EnterpriseManageCapabilities;
}

export interface ManagedProduct {
  id: string;
  name: string;
  description: string | null;
  airsMin: number | null;
  airsMax: number | null;
  airsNote: string | null;
  isActive: boolean;
}

export type ProductInput = Partial<
  Pick<ManagedProduct, 'name' | 'description' | 'airsMin' | 'airsMax' | 'airsNote' | 'isActive'>
>;

export type EnterpriseImageKind = 'logo' | 'banner';

export interface EnterpriseManageClient {
  overview(): Promise<EnterpriseManageOverview>;
  updateEnterprise(patch: Record<string, unknown>): Promise<ManagedEnterprise>;
  uploadImage(
    kind: EnterpriseImageKind,
    file: Blob & { type: string; size: number }
  ): Promise<void>;
  removeImage(kind: EnterpriseImageKind): Promise<void>;
  listProducts(): Promise<ManagedProduct[]>;
  createProduct(input: ProductInput): Promise<ManagedProduct>;
  updateProduct(productId: string, input: ProductInput): Promise<ManagedProduct>;
  deleteProduct(productId: string): Promise<void>;
  listTeam(): Promise<TeamMember[]>;
  addTeamMember(email: string, role: ManageRole): Promise<void>;
  revokeTeamMember(membershipId: string, reason: string): Promise<void>;
}

export function createEnterpriseManageClient(
  enterpriseId: string,
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
  apiUrl = resolveMobileApiBaseUrl()
): EnterpriseManageClient {
  const base = `${apiUrl.replace(/\/+$/, '')}/v1/me/enterprises/${encodeURIComponent(
    enterpriseId
  )}/manage`;

  async function request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const token = await getToken();
    if (!token) throw new ManageRequestError(401, 'AUTH_REQUIRED');
    const response = await fetcher(`${base}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
    if (!response.ok) {
      let code: string | undefined;
      try {
        const body = (await response.json()) as { code?: unknown };
        code = typeof body.code === 'string' ? body.code : undefined;
      } catch {
        // No JSON error body: the status code is enough.
      }
      throw new ManageRequestError(response.status, code);
    }
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  const imageField = (kind: EnterpriseImageKind): 'logoUrl' | 'bannerUrl' =>
    kind === 'logo' ? 'logoUrl' : 'bannerUrl';

  return {
    overview: () => request<EnterpriseManageOverview>(''),
    updateEnterprise: (patch) => request<ManagedEnterprise>('', { method: 'PATCH', body: patch }),
    async uploadImage(kind, file) {
      const problem = uploadProblem({ type: file.type, size: file.size });
      if (problem)
        throw new ManageRequestError(400, problem === 'type' ? 'UPLOAD_TYPE' : 'UPLOAD_SIZE');
      const signed = await request<{ uploadUrl: string; publicUrl: string }>('/upload-url', {
        method: 'POST',
        body: { kind, contentType: file.type },
      });
      const upload = await fetcher(signed.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'x-upsert': 'false' },
        body: file,
      });
      if (!upload.ok) throw new ManageRequestError(upload.status, 'UPLOAD_FAILED');
      await request('', { method: 'PATCH', body: { [imageField(kind)]: signed.publicUrl } });
    },
    // An empty string clears the image on the API.
    removeImage: (kind) => request<void>('', { method: 'PATCH', body: { [imageField(kind)]: '' } }),
    listProducts: () => request<ManagedProduct[]>('/products'),
    // Creation rejects nulls, so empty optional fields are left out instead.
    createProduct: (input) =>
      request<ManagedProduct>('/products', {
        method: 'POST',
        body: Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null)),
      }),
    updateProduct: (productId, input) =>
      request<ManagedProduct>(`/products/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        body: input,
      }),
    deleteProduct: (productId) =>
      request<void>(`/products/${encodeURIComponent(productId)}`, { method: 'DELETE' }),
    listTeam: () => request<TeamMember[]>('/team'),
    addTeamMember: (email, role) =>
      request<void>('/team', { method: 'POST', body: { email: email.trim(), role } }),
    revokeTeamMember: (membershipId, reason) =>
      request<void>(`/team/${encodeURIComponent(membershipId)}/revoke`, {
        method: 'POST',
        body: { reason },
      }),
  };
}

/** API body for a product from its form fields; blank Airs or text become null (cleared). */
export function productInput(draft: {
  name: string;
  description: string;
  airsMin: string;
  airsMax: string;
  airsNote: string;
}): ProductInput | null {
  const number = (value: string): number | null | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return /^\d+$/.test(trimmed) ? Number(trimmed) : undefined;
  };
  const airsMin = number(draft.airsMin);
  const airsMax = number(draft.airsMax);
  if (!draft.name.trim() || airsMin === undefined || airsMax === undefined) return null;
  if (airsMin !== null && airsMax !== null && airsMax < airsMin) return null;
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    airsMin,
    airsMax,
    airsNote: draft.airsNote.trim() || null,
  };
}
