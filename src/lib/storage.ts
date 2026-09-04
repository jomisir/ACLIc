import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "aclic-media";

/**
 * Where uploads go when Supabase is not configured.
 *
 * This exists so the site can be run and demonstrated locally without a
 * Supabase project — otherwise every photo, logo and report upload throws and
 * half the admin panel cannot be shown.
 *
 * It is deliberately unavailable in production: with NODE_ENV=production and no
 * Supabase credentials, `client()` throws exactly as it always did. A
 * misconfigured deployment must fail loudly, not quietly write files onto a
 * shared host's disk where nothing backs them up and the next deploy wipes them.
 */
const LOCAL_DIR = resolve(process.cwd(), ".local-storage");
const storeOnDisk = () =>
  process.env.NODE_ENV !== "production" && !process.env.SUPABASE_URL;

/**
 * Storage paths are built from randomUUID() plus, for resources, the uploaded
 * filename — which is attacker-influenced. Resolve and confine to LOCAL_DIR so
 * a crafted name can never escape it.
 */
function localPath(path: string) {
  const full = resolve(LOCAL_DIR, path);
  if (full !== LOCAL_DIR && !full.startsWith(LOCAL_DIR + sep)) {
    throw new Error("Refusing to resolve a storage path outside the local store.");
  }
  return full;
}

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Uploads to a private bucket — never exposed by public URL. Served only through /api/media/[id]. */
export async function uploadToStorage(path: string, data: Buffer, contentType: string) {
  if (storeOnDisk()) {
    const full = localPath(path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
    return path;
  }

  const { error } = await client().storage.from(BUCKET).upload(path, data, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function downloadFromStorage(path: string) {
  if (storeOnDisk()) {
    return new Blob([await readFile(localPath(path))]);
  }

  const { data, error } = await client().storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}

export async function deleteFromStorage(path: string) {
  if (storeOnDisk()) {
    await unlink(localPath(path)).catch(() => {});
    return;
  }

  await client().storage.from(BUCKET).remove([path]);
}
