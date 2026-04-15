export function getFirstName(name?: string): string {
  if (!name?.trim()) return 'Account';
  return name.trim().split(/\s+/)[0] ?? 'Account';
}
