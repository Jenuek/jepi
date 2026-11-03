// The shapes of JEPI's saved data. Old code (src/js) uses the same shapes without types.

/** A login session with the Supabase server */
export interface Session {
  access: string;
  refresh: string;
  /** when the access token runs out (ms since 1970; one minute early on purpose) */
  exp: number;
  /** Supabase user id */
  user?: string;
  email?: string;
}

/** Sync settings and progress, saved as localStorage "jepi.sync" */
export interface SyncState {
  url: string;
  /** publishable (public) key only */
  key: string;
  email: string;
  sess: Session | null;
  /** newest server "updated" time already pulled */
  lastPull: number;
  /** what was last sent per document id: a hash of its data, or 'x' for deleted */
  sent: Record<string, string>;
  /** last time a push or pull finished */
  at: number;
  msg: string;
}

/** One row of the server table jepi_docs (one per person per document) */
export interface DocRow {
  user_id?: string;
  /** 'plan:<planId>' | 'kw' | 'myplaces' | 'keys' */
  id: string;
  kind: 'plan' | 'kw' | 'myplaces' | 'keys';
  data: unknown;
  updated: number;
  deleted?: boolean;
}

/** One entry of the plan list (localStorage "gp.plans") */
export interface PlanMeta {
  id: string;
  name: string;
  updated?: number;
  /** a trip shared with friends: it syncs through jepi_trips, not jepi_docs */
  shared?: unknown;
  [more: string]: unknown;
}

/** AI·map keys, encrypted with a key made from the password (never sent in the clear) */
export interface SealedBox {
  v: 1;
  iv: string;
  ct: string;
}

/** Errors carry a short code the screens react to */
export type ErrorCode = 'network' | 'auth' | 'rate_limited' | 'upstream_error' | 'server' | string;
export interface AppError extends Error {
  code: ErrorCode;
  text?: string;
}
