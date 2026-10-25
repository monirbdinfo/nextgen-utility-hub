export type Lang = 'en' | 'bn';

export interface LocalizedText {
  en: string;
  bn: string;
}

/** Only `available` tools may be linked/launched. Everything else is roadmap. */
export type ToolStatus = 'planned' | 'in-progress' | 'available';

export type CategoryId =
  | 'general'
  | 'jobs'
  | 'bangla'
  | 'files'
  | 'network'
  | 'ip-tools'
  | 'productivity';

export type IconName = 'toolbox' | 'briefcase' | 'bangla' | 'shield' | 'network';

export interface Category {
  id: CategoryId;
  icon: IconName;
  name: LocalizedText;
  description: LocalizedText;
}

export interface Tool {
  id: string;
  category: CategoryId;
  name: LocalizedText;
  description: LocalizedText;
  keywords: string[];
  status: ToolStatus;
  /** Hash route, required once status is `available`. */
  route?: string;
  /**
   * Set for the few tools that must contact a server, and only after the user asks:
   * `cloudflare` (Cloudflare 1.1.1.1 services) or `same-site` (the server hosting this site).
   * Everything else runs offline in the browser.
   */
  online?: 'cloudflare' | 'same-site';
}
