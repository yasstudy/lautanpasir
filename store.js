// Penyimpanan: Postgres jika DATABASE_URL ada (tahan restart/deploy), kalau tidak file JSON di DATA_DIR.
const fs = require('node:fs/promises'), path = require('node:path');
const DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
let pool = null;
async function init() {
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await pool.query('create table if not exists kv(k text primary key, v jsonb not null)');
  } else await fs.mkdir(DIR, { recursive: true });
}
async function set(k, v) {
  if (pool) { await pool.query('insert into kv(k,v) values($1,$2) on conflict(k) do update set v=$2', [k, JSON.stringify(v)]); return; }
  const f = path.join(DIR, k + '.json'), t = f + '.tmp';
  await fs.writeFile(t, JSON.stringify(v, null, 2)); await fs.rename(t, f);
}
async function get(k, def) {
  if (pool) { const r = await pool.query('select v from kv where k=$1', [k]); if (r.rows[0]) return r.rows[0].v; await set(k, def); return def; }
  try { return JSON.parse(await fs.readFile(path.join(DIR, k + '.json'), 'utf8')); } catch { await set(k, def); return def; }
}
module.exports = { init, get, set };
