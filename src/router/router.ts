import { getTool, isCategoryId, type CategoryId } from '../registry';

export type Route =
  { name: 'home' } | { name: 'category'; id: CategoryId } | { name: 'tool'; id: string };

/**
 * Hash routes: `#/`, `#/category/<id>` and `#/tool/<id>`. A tool route only
 * resolves for tools whose status is `available`; anything else falls back to
 * home. Plain fragments such as `#main` or `#about` are in-page anchors, not
 * routes, and return `null` so the caller keeps the current route.
 */
export function parseHash(hash: string): Route | null {
  if (!hash.startsWith('#/')) return hash === '' || hash === '#' ? { name: 'home' } : null;
  const parts = hash.slice(2).split('/').filter(Boolean);
  if (parts.length === 2 && parts[1]) {
    const [kind, id] = parts as [string, string];
    if (kind === 'category' && isCategoryId(id)) return { name: 'category', id };
    if (kind === 'tool' && getTool(id)?.status === 'available') return { name: 'tool', id };
  }
  return { name: 'home' };
}

export function toHash(route: Route): string {
  if (route.name === 'category') return `#/category/${route.id}`;
  if (route.name === 'tool') return `#/tool/${route.id}`;
  return '#/';
}
