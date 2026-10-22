import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { openDatabase } from "../server/database.mjs";
import worker from "../dist/server/index.js";

// Exercise the bundled Worker against the real SQL schema through its D1 contract.
const database = openDatabase(":memory:");
const DB = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async all() {
            return { results: await database.all(sql, ...args) };
          },
          async first() {
            return (await database.get(sql, ...args)) || null;
          },
          async run() {
            const result = await database.run(sql, ...args);
            return { meta: { changes: result.changes } };
          },
        };
      },
    };
  },
};
const origin = "https://artifact.test";
const env = {
  DB,
  APP_ORIGIN: origin,
  ASSETS: {
    async fetch(request) {
      const pathname = new URL(request.url).pathname;
      try {
        const data = await readFile(
          new URL("../dist/client" + pathname, import.meta.url),
        );
        return new Response(data);
      } catch {
        return new Response("Not found", { status: 404 });
      }
    },
  },
};
const request = (path, method = "GET", body, cookie) =>
  new Request(origin + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
try {
  assert.equal((await worker.fetch(request("/"), env)).status, 200);
  assert.equal((await worker.fetch(request("/dashboard"), env)).status, 302);
  const register = await worker.fetch(
    request("/api/auth/register", "POST", {
      name: "Artifact check",
      email: "artifact@example.test",
      password: "Artifact-only-passphrase-2026",
    }),
    env,
  );
  assert.equal(register.status, 201);
  const cookie = register.headers.get("set-cookie").split(";")[0];
  assert.match(register.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
  assert.equal(
    (await worker.fetch(request("/dashboard", "GET", undefined, cookie), env))
      .status,
    200,
  );
  assert.equal(
    (
      await worker.fetch(request("/admin", "GET", undefined, cookie), env)
    ).headers.get("location"),
    origin + "/unauthorized",
  );
  assert.equal(
    (
      await worker.fetch(
        request("/api/admin/users", "GET", undefined, cookie),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (await worker.fetch(request("/api/auth/logout", "POST", {}, cookie), env))
      .status,
    200,
  );
  assert.equal(
    (await worker.fetch(request("/api/profile", "GET", undefined, cookie), env))
      .status,
    401,
  );
  console.log(
    "Bundled Worker verification passed: assets, D1 schema, bcrypt, sessions, role checks, and logout.",
  );
} finally {
  database.close();
}
