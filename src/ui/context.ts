import type { MessageKey } from '../i18n';
import type { Lang, Tool } from '../registry';
import type { Route } from '../router/router';

export type Theme = 'light' | 'dark';

export interface AppState {
  lang: Lang;
  theme: Theme;
  route: Route;
  query: string;
}

export interface AppContext {
  state: AppState;
  t(key: MessageKey, vars?: Record<string, string | number>): string;
  /** Change route through the URL hash so back/forward works. `focusId` is focused after render. */
  navigate(route: Route, focusId?: string): void;
  setLang(lang: Lang): void;
  setTheme(theme: Theme): void;
}

export const statusKey: Record<Tool['status'], MessageKey> = {
  planned: 'statusPlanned',
  'in-progress': 'statusInProgress',
  available: 'statusAvailable',
};

export const REPO_URL = 'https://github.com/monirbdinfo/nextgen-utility-hub';
