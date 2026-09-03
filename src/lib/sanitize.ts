import sanitizeHtml from "sanitize-html";

/**
 * Rich-text content is authored in /admin and rendered to the public site,
 * so it MUST be sanitized before storage. An editor account is trusted to
 * write content, not to inject script — and a compromised or careless
 * editor account should not be able to turn every public page into a
 * stored-XSS vector.
 *
 * The allowlist is deliberately tight: exactly the formatting the editor
 * toolbar can produce, and nothing else. No images (those go through the
 * media library, which strips EXIF), no iframes, no style attributes.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "a",
  "code",
  "pre",
  "hr",
];

export function sanitizeRichText(dirty: string | null | undefined): string | null {
  if (!dirty) return null;

  const clean = sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    // Block javascript:, data: and other script-bearing URL schemes.
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    // Anything not on the allowlist is dropped tag-and-all for <script> and
    // <style> (so their contents don't leak into the page as text), and
    // unwrapped otherwise (so the text survives).
    nonTextTags: ["script", "style", "textarea", "option", "noscript"],
    transformTags: {
      // Every outbound link opens safely: noopener blocks window.opener
      // access, noreferrer blocks referrer leakage.
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          ...(attribs.href?.startsWith("http")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {}),
        },
      }),
    },
  }).trim();

  // Editors that emit an empty paragraph for "no content" should be treated
  // as empty, so empty-state rendering still kicks in on the public site.
  const withoutMarkup = clean.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return withoutMarkup.length === 0 ? null : clean;
}

/**
 * Plain-text sanitizer for short fields (names, titles, captions) that must
 * never contain markup at all.
 */
export function sanitizePlainText(dirty: string | null | undefined): string | null {
  if (!dirty) return null;
  const clean = sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: {} }).trim();
  return clean.length === 0 ? null : clean;
}
