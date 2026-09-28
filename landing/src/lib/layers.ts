/**
 * Every z-index on the page lives here. Systemic layers only: nothing
 * else in the codebase is allowed to set one.
 */
export const LAYER = {
  page: 0,
  nav: 40,
  menu: 50,
} as const;
