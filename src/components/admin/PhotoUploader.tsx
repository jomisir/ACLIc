"use client";

import { useRef, useState, useTransition } from "react";

export function PhotoUploader({
  currentPath,
  onUpload,
}: {
  currentPath: string | null;
  onUpload: (formData: FormData) => Promise<{ id: string; filePath: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState(currentPath);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      try {
        const result = await onUpload(fd);
        setPath(result.filePath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-[#c8a24a]/10 border border-[#c8a24a]/30 flex items-center justify-center text-xs text-[#5a5e67] overflow-hidden">
        {path ? "Uploaded" : "No photo"}
      </div>
      <div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} disabled={pending} />
        <p className="text-xs text-[#5a5e67] mt-1">
          Stripped of EXIF/GPS and resized to 800px on upload.
        </p>
        {pending && <p className="text-xs">Uploading…</p>}
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}
