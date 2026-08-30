// Downloads every object in the Supabase Storage bucket into ./backup/storage/,
// preserving the key structure. Run by .github/workflows/backup.yml.
//
// Uses the supabase-js SDK (already a project dependency) rather than the
// Supabase CLI, so the exact call shapes here are the documented, typed ones.
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "aclic-media";

if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const outRoot = join(process.cwd(), "backup", "storage");

/** Storage list() is per-prefix and paginated; folders come back with id === null. */
async function listAll(prefix = "") {
  const files = [];
  const pageSize = 100;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset });

    if (error) throw new Error(`list("${prefix}") failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        files.push(...(await listAll(path))); // folder — recurse
      } else {
        files.push(path);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return files;
}

const paths = await listAll();
console.log(`Found ${paths.length} object(s) in bucket "${bucket}".`);

let ok = 0;
const failures = [];

for (const path of paths) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    failures.push(`${path}: ${error?.message ?? "no data returned"}`);
    continue;
  }
  const dest = join(outRoot, path);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await data.arrayBuffer()));
  ok++;
}

console.log(`Downloaded ${ok}/${paths.length} object(s) to backup/storage/.`);

if (failures.length > 0) {
  // Fail the job: a backup that silently skipped files is worse than no
  // backup, because it looks like it worked.
  console.error(`Failed to download ${failures.length} object(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
