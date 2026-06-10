import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["strong", "em", "u", "p", "br", "ul", "ol", "li", "a"] as const;

/** Limite le HTML éditeur au sous-ensemble autorisé pour les champs AOP. */
export function sanitizeRichTextHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

/** Considère vide un éditeur TipTap (ex. `<p></p>`, espaces, `<br>` seul). */
export function isRichTextHtmlEmpty(html: string | null | undefined): boolean {
  if (!html?.trim()) return true;
  const stripped = sanitizeRichTextHtml(html)
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<\/?p>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .trim();
  return stripped === "";
}

/** Valeur à persister : `null` si vide après assainissement. */
export function normalizeRichTextForStorage(html: string | null | undefined): string | null {
  if (!html) return null;
  const sanitized = sanitizeRichTextHtml(html);
  return isRichTextHtmlEmpty(sanitized) ? null : sanitized;
}
