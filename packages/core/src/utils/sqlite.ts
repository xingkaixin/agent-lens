/**
 * SQLite helper — graceful degradation if better-sqlite3 is unavailable.
 */

import { createRequire } from "node:module";

let DatabaseConstructor: ((path: string) => unknown) | null = null;

try {
  const require = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("better-sqlite3");
  DatabaseConstructor =
    typeof mod === "function"
      ? mod
      : ((mod as { default?: unknown }).default as typeof DatabaseConstructor);
} catch {
  // better-sqlite3 not installed — adapters that need SQLite will gracefully skip
}

export interface DatabaseRow {
  [key: string]: unknown;
}

export interface SQLiteDatabase {
  prepare(sql: string): {
    all(...params: unknown[]): DatabaseRow[];
    get(...params: unknown[]): DatabaseRow | undefined;
    run(...params: unknown[]): void;
  };
  close(): void;
}

/**
 * Open a SQLite database in read-only mode.
 * Returns null if better-sqlite3 is unavailable or the file can't be opened.
 */
export function openDbReadOnly(dbPath: string): SQLiteDatabase | null {
  if (!DatabaseConstructor) return null;
  try {
    // better-sqlite3 constructor with readonly flag
    const db = (
      DatabaseConstructor as (path: string, options?: { readonly?: boolean }) => SQLiteDatabase
    )(dbPath, { readonly: true });
    return db;
  } catch {
    return null;
  }
}

/**
 * Check if SQLite support is available.
 */
export function isSqliteAvailable(): boolean {
  return DatabaseConstructor !== null;
}
