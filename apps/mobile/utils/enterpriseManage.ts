import { resolveMobileApiBaseUrl } from './runtimeConfig';
import {
  ManageRequestError,
  mergeEdited,
  uploadProblem,
  type ManageRole,
  type TeamMember,
} from './projectManage';

/** Client for the in-app "Manage enterprise" API (/v1/me/enterprises/:id/manage, ...). */

/** Languages of the enterprise forms: Spanish edits the base fields, English its translation. */
export const ENTERPRISE_LOCALES = ['es', 'en'] as const;
export type EnterpriseLocale = (typeof ENTERPRISE_LOCALES)[number];

/** Most photos an enterprise gallery holds (the API and the database allow no more). */
export const GALLERY_MAX = 12;

export interface GalleryImage {
  url: string;
  altText: string;
}

/** Text in other languages, keyed by locale; Spanish stays in the base fields. */
export type Translations<Field extends string> = Record<string, Partial<Record<Field, string>>>;

export type ProductTextField = 'name' | 'description' | 'airsNote';

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
  gallery?: GalleryImage[];
  translations?: Translations<'sector' | 'description'>;
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
  translations?: Translations<ProductTextField>;
  isActive: boolean;
}

export type ProductInput = Partial<
  Pick<
    ManagedProduct,
    'name' | 'description' | 'airsMin' | 'airsMax' | 'airsNote' | 'translations' | 'isActive'
  >
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
  /** Uploads a photo and adds it at the end of the gallery. */
  addGalleryImage(file: Blob & { type: string; size: number }, altText: string): Promise<void>;
  removeGalleryImage(url: string): Promise<void>;
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

  /** Uploads the file through a signed URL and returns the public URL to save. */
  async function uploadFile(
    kind: EnterpriseImageKind | 'gallery',
    file: Blob & { type: string; size: number }
  ): Promise<string> {
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
    return signed.publicUrl;
  }

  // The API saves the gallery whole, so each change starts from the stored list.
  async function saveGallery(change: (gallery: GalleryImage[]) => GalleryImage[]): Promise<void> {
    const { enterprise } = await request<EnterpriseManageOverview>('');
    await request('', { method: 'PATCH', body: { gallery: change(enterprise.gallery ?? []) } });
  }

  return {
    overview: () => request<EnterpriseManageOverview>(''),
    updateEnterprise: (patch) => request<ManagedEnterprise>('', { method: 'PATCH', body: patch }),
    async uploadImage(kind, file) {
      const url = await uploadFile(kind, file);
      await request('', { method: 'PATCH', body: { [imageField(kind)]: url } });
    },
    // An empty string clears the image on the API.
    removeImage: (kind) => request<void>('', { method: 'PATCH', body: { [imageField(kind)]: '' } }),
    async addGalleryImage(file, altText) {
      const url = await uploadFile('gallery', file);
      await saveGallery((gallery) => [...gallery, { url, altText: altText.trim() }]);
    },
    removeGalleryImage: (url) =>
      saveGallery((gallery) => gallery.filter((image) => image.url !== url)),
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

/**
 * Stored translations with one language's form fields merged in. Blank fields are left out, so
 * readers get the Spanish text for them; a language left with no fields is dropped.
 */
export function withTranslation<Field extends string>(
  stored: Translations<Field> | undefined,
  locale: string,
  edited: Record<Field, string>
): Translations<Field> {
  const { [locale]: current, ...others } = stored ?? {};
  const merged = mergeEdited(current, edited) as Partial<Record<Field, string>>;
  return Object.keys(merged).length ? { ...others, [locale]: merged } : others;
}

/**
 * API body for a product from its form fields; blank Airs or text become null (cleared). The
 * English fields are merged into the stored translations.
 */
export function productInput(
  draft: {
    name: string;
    description: string;
    airsMin: string;
    airsMax: string;
    airsNote: string;
    en: Record<ProductTextField, string>;
  },
  stored?: Translations<ProductTextField>
): ProductInput | null {
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
    translations: withTranslation(stored, 'en', draft.en),
  };
}
