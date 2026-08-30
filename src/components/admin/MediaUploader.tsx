"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadImage } from "@/actions/media";

export function MediaUploader() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      try {
        await uploadImage(fd);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  return (
    <div className="border border-[#c8a24a]/30 rounded p-4 mb-8">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} disabled={pending} />
      <p className="text-xs text-[#5a5e67] mt-1">EXIF/GPS stripped, resized to 800px, converted to WebP.</p>
      {pending && <p className="text-xs">Uploading…</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
