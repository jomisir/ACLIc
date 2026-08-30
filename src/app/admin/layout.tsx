import type { Metadata } from "next";
import { bodyLatin } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "ACLIC Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bodyLatin.variable} data-theme="light">
      <body className="font-body">{children}</body>
    </html>
  );
}
