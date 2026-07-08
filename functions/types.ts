/// <reference types="@cloudflare/workers-types" />

/** Cloudflare Pages Functions environment bindings. */
export interface Env {
  DB: D1Database;
}
