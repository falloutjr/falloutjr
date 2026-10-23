// @ts-check
/** @param {import('./types.js').D1Binding} binding @returns {import('./types.js').Database} */
export function d1Database(binding) {
  return {
    all: async (sql, ...args) => (await binding.prepare(sql).bind(...args).all()).results,
    get: async (sql, ...args) => binding.prepare(sql).bind(...args).first(),
    run: async (sql, ...args) => {
      const result = await binding.prepare(sql).bind(...args).run();
      return { changes: result.meta?.changes || 0 };
    },
  };
}
