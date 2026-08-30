# Restoring from backup

This procedure has been run once against a full copy of the schema and seed
data (17 leaders, 15 partners, 1 user) and confirmed to restore every row
correctly. Follow it in this order.

## 1. Restore the database

```bash
# Create a fresh, empty database to restore into (never restore over a live one directly).
createdb -h <host> -U <user> aclic_restore_check

# Restore the dump produced by deploy/backup.sh.
pg_restore --dbname="postgresql://<user>:<password>@<host>:5432/aclic_restore_check" \
  /var/backups/aclic/db/aclic-<TIMESTAMP>.dump

# Sanity-check row counts before cutting over.
psql "postgresql://<user>:<password>@<host>:5432/aclic_restore_check" \
  -c "select count(*) from leaders;" \
  -c "select count(*) from partners;" \
  -c "select count(*) from pages;" \
  -c "select count(*) from users;"
```

Once the counts look right, point `DATABASE_URL` at `aclic_restore_check`
(or rename databases) and restart the app.

## 2. Restore storage

```bash
supabase storage cp --recursive \
  /var/backups/aclic/storage/<TIMESTAMP> \
  "ss://${SUPABASE_STORAGE_BUCKET:-aclic-media}"
```

## 3. Verify

- Sign in to `/admin` and confirm the dashboard, leaders, and partners lists match what you expect.
- Open a published leader profile and a published partner logo on the public site and confirm the images load through `/api/leaders/[id]/photo` and `/api/partners/[id]/logo`.
- Check `/admin/audit-log` — the restored log should end at the last action before the backup was taken.

## Notes

- `pg_restore` requires the target database to exist and be empty (or use `--clean` to drop existing objects first — do this only against a database you intend to fully overwrite).
- Never run a restore directly against the production database without first restoring into a throwaway database and checking it, as shown above.
