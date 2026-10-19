import type { extractAdminIdentity } from '../auth/oidc-client';

export type AdminIdentity = NonNullable<ReturnType<typeof extractAdminIdentity>>;
