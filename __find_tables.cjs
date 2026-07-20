const fs = require('fs'); const path = require('path');
const t = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {}; for (const line of t.split(/\r?\n/)) { const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/); if (!m) continue; let v = m[2]; if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); env[m[1]] = v; }
const { Client } = require('pg');
const wanted = ['users','user_record_summary','risk_factors_test','pd_screenings','pd_prodromal_details','pd_pd_details','pd_risk_factors','admin_users'];
(async () => {
  const c = new Client({ host: env.PGHOST, port: Number(env.PGPORT || 5432), database: env.PGDATABASE, user: env.PGUSER, password: env.PGPASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = await c.query(
    `select n.nspname as sch, c.relname as tbl,
            case c.relkind when 'r' then 'table' when 'v' then 'view' when 'm' then 'matview' else c.relkind::text end as kind,
            c.relrowsecurity as rls
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where c.relname = any($1) and n.nspname not in ('pg_catalog','information_schema')
      order by c.relname, n.nspname`, [wanted]);
  console.log('schema.name           kind     rls');
  for (const r of q.rows) console.log(`  ${(r.sch+'.'+r.tbl).padEnd(34)} ${r.kind.padEnd(8)} ${r.rls}`);
  await c.end(); process.exit(0);
})().catch(e => { console.error('ERR:', e.message || e); process.exit(1); });
