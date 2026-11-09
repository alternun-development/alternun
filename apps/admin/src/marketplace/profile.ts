import type { EnterpriseProduct, EnterpriseSite, InternalContact } from './api';

// Text-area formats for list fields: one item per line, parts separated by "|".

function lines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parts(line: string): string[] {
  return line.split('|').map((part) => part.trim());
}

export function parseLines(text: string): string[] {
  return lines(text);
}

export function formatLines(values: readonly string[] | undefined): string {
  return (values ?? []).join('\n');
}

/** "name | address | rooms" per line. */
export function parseSites(text: string): EnterpriseSite[] {
  return lines(text).map((line) => {
    const [name, address, rooms] = parts(line);
    const site: EnterpriseSite = { name };
    if (address) site.address = address;
    if (rooms && /^\d+$/.test(rooms)) site.rooms = Number(rooms);
    return site;
  });
}

export function formatSites(sites: readonly EnterpriseSite[] | undefined): string {
  return (sites ?? [])
    .map((site) =>
      [site.name, site.address ?? '', typeof site.rooms === 'number' ? String(site.rooms) : '']
        .join(' | ')
        .replace(/(\s\|\s)+$/, '')
    )
    .join('\n');
}

/** "name | role | email" per line. */
export function parseInternalContacts(text: string): InternalContact[] {
  return lines(text).map((line) => {
    const [name, role, email] = parts(line);
    const contact: InternalContact = { name };
    if (role) contact.role = role;
    if (email) contact.email = email;
    return contact;
  });
}

export function formatInternalContacts(contacts: readonly InternalContact[] | undefined): string {
  return (contacts ?? [])
    .map((contact) =>
      [contact.name, contact.role ?? '', contact.email ?? ''].join(' | ').replace(/(\s\|\s)+$/, '')
    )
    .join('\n');
}

/** Drops empty values so a cleared input removes the key instead of storing "". */
export function compactRecord<T extends Record<string, string | undefined>>(
  record: T
): Partial<Record<keyof T, string>> {
  const result: Partial<Record<keyof T, string>> = {};
  for (const [key, value] of Object.entries(record))
    if (typeof value === 'string' && value.trim()) result[key as keyof T] = value.trim();
  return result;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Only the fields whose value changed, ready for a PATCH body. */
export function changedFields<T extends Record<string, unknown>>(
  current: Partial<T>,
  next: T
): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(next) as Array<keyof T>)
    if (!sameValue(current[key], next[key])) patch[key] = next[key];
  return patch;
}

export type ProductDraft = {
  name: string;
  description: string;
  airsMin: string;
  airsMax: string;
  airsNote: string;
  isActive: boolean;
};

export function productDraft(product?: EnterpriseProduct): ProductDraft {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    airsMin:
      product?.airsMin === null || product?.airsMin === undefined ? '' : String(product.airsMin),
    airsMax:
      product?.airsMax === null || product?.airsMax === undefined ? '' : String(product.airsMax),
    airsNote: product?.airsNote ?? '',
    isActive: product?.isActive ?? true,
  };
}

export function validateProductDraft(draft: ProductDraft): 'name' | 'airs' | null {
  if (!draft.name.trim()) return 'name';
  const numbers = [draft.airsMin, draft.airsMax].map((value) => value.trim());
  if (numbers.some((value) => value && !/^\d+$/.test(value))) return 'airs';
  const [min, max] = numbers;
  if (min && max && Number(max) < Number(min)) return 'airs';
  return null;
}

/** API body for a product; empty optional fields are sent as null so an edit can clear them. */
export function productBody(draft: ProductDraft): Record<string, unknown> {
  const number = (value: string) => (value.trim() ? Number(value.trim()) : null);
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    airsMin: number(draft.airsMin),
    airsMax: number(draft.airsMax),
    airsNote: draft.airsNote.trim() || null,
    isActive: draft.isActive,
  };
}

/** For creation the API rejects nulls, so optional fields are left out instead. */
export function productCreateBody(draft: ProductDraft): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(productBody(draft)).filter(([, value]) => value !== null)
  );
}
