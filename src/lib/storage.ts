import "server-only";
import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "aclic-media";

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
  const { error } = await client().storage.from(BUCKET).upload(path, data, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function downloadFromStorage(path: string) {
  const { data, error } = await client().storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}

export async function deleteFromStorage(path: string) {
  await client().storage.from(BUCKET).remove([path]);
}
