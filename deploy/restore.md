# Restoring from backup

Backups are produced by `.github/workflows/backup.yml` (nightly at 02:00 UTC,
also runnable on demand from the Actions tab). Each run uploads a workflow
artifact named `aclic-backup-<run_id>` containing:

```
backup/aclic-<TIMESTAMP>.dump   # pg_dump custom-format dump of the Neon database
backup/storage/...              # every object from the Supabase Storage bucket
```

Artifacts are retained for 30 days. Download one from the Actions run page.

This procedure has been run end to end against a full copy of the schema and
seed data (17 leaders, 15 partners, 11 pages, 1 user) and confirmed to restore
every row. Follow it in this order.

## 1. Restore the database

Never restore straight over the live database. Restore into a fresh one,
check it, then cut over.

```bash
# Create an empty database to restore into. On Neon, create a new branch or
# database from the console; anywhere else, createdb works:
createdb -h <host> -U <user> aclic_restore_check

# Restore the dump from the workflow artifact.
pg_restore --dbname="postgresql://<user>:<password>@<host>/aclic_restore_check" \
  backup/aclic-<TIMESTAMP>.dump

# Sanity-check row counts before cutting over.
psql -t "postgresql://<user>:<password>@<host>/aclic_restore_check" \
  -c "select 'leaders: '||count(*) from leaders;" \
  -c "select 'partners: '||count(*) from partners;" \
  -c "select 'pages: '||count(*) from pages;" \
  -c "select 'users: '||count(*) from users;"
```

Once the counts look right, point `DATABASE_URL` at the restored database
(in cPanel → Setup Node.js App → Environment variables) and restart the app
from the same screen.

Note: `pg_dump`/`pg_restore` connect over the normal Postgres protocol on
5432, not the HTTP driver the app uses. Run them from your own machine or
CI, never from the shared host — see `deploy.md`.

## 2. Restore storage

The storage half of the artifact is a plain directory tree mirroring the
bucket's keys. Upload it back with the Supabase CLI:

```bash
supabase storage cp --recursive \
  backup/storage \
  "ss://${SUPABASE_STORAGE_BUCKET:-aclic-media}"
```

Or, if you prefer not to depend on CLI syntax, re-upload through the Supabase
dashboard (Storage → the bucket → Upload), preserving the folder structure —
paths must match exactly, because `leaders.photo_path`, `partners.logo_path`
and `resources.file_path` reference them by key.

## 3. Verify

- Sign in to `/admin` and confirm the dashboard, leaders and partners lists
  match what you expect.
- Open a published leader profile and a published partner logo on the public
  site; confirm images load through `/api/leaders/[id]/photo` and
  `/api/partners/[id]/logo` (these read from storage, so they exercise
  step 2).
- Check `/admin/audit-log` — the restored log should end at the last action
  before the backup ran.

## Notes

- `pg_restore` needs the target database to exist and be empty. `--clean`
  drops existing objects first; only use it against a database you intend to
  overwrite entirely.
- The dump is custom-format (`--format=custom`), so it must be restored with
  `pg_restore`, not `psql`.
- If the backup workflow fails, it fails loudly and the job goes red — the
  storage script exits non-zero if any single object fails to download,
  precisely so a partial backup never masquerades as a complete one.
