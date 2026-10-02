import { categories } from './categories';
import { tools } from './tools';
import type { Category, CategoryId, IconName, Lang, Tool, ToolStatus } from './types';

export { categories, tools };
export type { Category, CategoryId, IconName, Lang, Tool, ToolStatus };

export function isCategoryId(value: string): value is CategoryId {
  return categories.some((c) => c.id === value);
}

export function getCategory(id: CategoryId): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function toolsByCategory(id: CategoryId, source: readonly Tool[] = tools): Tool[] {
  return source.filter((t) => t.category === id);
}

/** Case-insensitive search across names, descriptions and keywords in both languages. */
export function searchTools(query: string, lang: Lang, source: readonly Tool[] = tools): Tool[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return source
    .map((tool) => {
      const name = tool.name[lang].toLowerCase();
      const haystack = [
        tool.name.en,
        tool.name.bn,
        tool.description.en,
        tool.description.bn,
        ...tool.keywords,
      ]
        .join(' ')
        .toLowerCase();
      if (!terms.every((t) => haystack.includes(t))) return null;
      return { tool, score: terms.some((t) => name.includes(t)) ? 0 : 1 };
    })
    .filter((r): r is { tool: Tool; score: number } => r !== null)
    .sort((a, b) => a.score - b.score)
    .map((r) => r.tool);
}
