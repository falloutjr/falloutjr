import { mkdir, rm, cp, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
const root = new URL("../", import.meta.url);
const at = (path) => new URL(path, root);
await rm(at("dist/"), { recursive: true, force: true });
await mkdir(at("dist/client/"), { recursive: true });
await mkdir(at("dist/server/"), { recursive: true });
await mkdir(at("dist/.openai/"), { recursive: true });
for (const path of [
  "index.html",
  "assets",
  "css",
  "js",
  "robots.txt",
  "sitemap.xml",
])
  await cp(at(path), at("dist/client/" + path), { recursive: true });
// Keep the public shell small; server-side routing always runs before protected HTML.
for (const path of ["css/style.css", "css/portal.css", "css/theme.css"]) {
  const result = await build({
    stdin: {
      contents: await readFile(at(path), "utf8"),
      loader: "css",
      resolveDir: new URL("dist/client/css/", root).pathname,
    },
    bundle: false,
    minify: true,
    write: false,
  });
  await writeFile(at("dist/client/" + path), result.outputFiles[0].contents);
}
await rm(at("dist/client/js/"), { recursive: true, force: true });
await build({
  entryPoints: [at("js/main.js").pathname],
  outdir: at("dist/client/js/").pathname,
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  entryNames: "main",
  chunkNames: "chunks/[name]-[hash]",
});
await build({
  entryPoints: [at("server/worker.mjs").pathname],
  outfile: at("dist/server/index.js").pathname,
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "linked",
});
await cp(at(".openai/hosting.json"), at("dist/.openai/hosting.json"));
await cp(at("migrations/"), at("dist/migrations/"), { recursive: true });
const wrangler = {
  name: "falloutjr-studio",
  main: "index.js",
  compatibility_date: "2026-10-01",
  compatibility_flags: ["nodejs_compat"],
  assets: { directory: "../client", binding: "ASSETS", run_worker_first: true },
  d1_databases: [
    {
      binding: "DB",
      database_name: "falloutjr-studio-db",
      database_id: "00000000-0000-0000-0000-000000000000",
      migrations_dir: "../migrations",
    },
  ],
  vars: { NODE_ENV: "production" },
};
await writeFile(
  at("dist/server/wrangler.json"),
  JSON.stringify(wrangler, null, 2) + "\n",
);
console.log(
  "Production build ready: dist/client and dist/server/index.js. Secrets and local databases excluded.",
);
