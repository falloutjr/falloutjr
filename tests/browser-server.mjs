// Isolated browser-test server. Only this dedicated fixture database is reset.
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from '../server/index.mjs';

const filename = resolve('work/browser-test.sqlite');
for (const suffix of ['', '-wal', '-shm']) rmSync(filename + suffix, { force: true });
const { server, db } = createServer({ env: { ...process.env, DATABASE_PATH: filename } });
server.listen(3100, '0.0.0.0');
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
