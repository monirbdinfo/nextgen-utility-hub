import { isCategoryId, type CategoryId } from '../registry';

export type Route = { name: 'home' } | { name: 'category'; id: CategoryId };

/**
 * Hash routes look like `#/` or `#/category/<id>`. Plain fragments such as
 * `#main` or `#about` are in-page anchors, not routes, and return `null` so the
 * caller keeps the current route.
 */
export function parseHash(hash: string): Route | null {
  if (!hash.startsWith('#/')) return hash === '' || hash === '#' ? { name: 'home' } : null;
  const parts = hash.slice(2).split('/').filter(Boolean);
  if (parts.length === 2 && parts[0] === 'category' && parts[1] && isCategoryId(parts[1])) {
    return { name: 'category', id: parts[1] };
  }
  return { name: 'home' };
}

export function toHash(route: Route): string {
  return route.name === 'category' ? `#/category/${route.id}` : '#/';
}
