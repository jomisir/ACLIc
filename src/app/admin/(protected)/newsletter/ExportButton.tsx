"use client";

import { useTransition } from "react";
import { exportSubscribersCsv } from "@/actions/newsletter-export";

export function ExportButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const csv = await exportSubscribersCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aclic-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <button onClick={handleClick} disabled={pending} className="bg-[#0e0e10] text-white rounded px-4 py-2 disabled:opacity-50">
      {pending ? "Preparing…" : "Export CSV"}
    </button>
  );
}
