import { sanitizeRichText } from "@/lib/sanitize";

/**
 * Renders admin-authored rich text on the public site.
 *
 * Content is sanitized on the way IN (in the server actions, before it is
 * stored) and again here on the way OUT. The second pass is deliberate
 * belt-and-braces: it means rows written before sanitizing existed, or by
 * any future code path that forgets, still cannot inject script into a
 * public page.
 */
export function RichText({ html, className = "" }: { html: string | null; className?: string }) {
  const clean = sanitizeRichText(html);
  if (!clean) return null;

  return (
    <div
      className={`prose-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
