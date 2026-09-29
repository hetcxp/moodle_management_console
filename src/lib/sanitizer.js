/**
 * HTML Sanitizer utility to prevent stored XSS across views.
 * Strips script tags, iframes, objects, embeds, meta/base/link/form tags,
 * inline event handlers (on*), and dangerous URI schemes (javascript:, data:text/html).
 */

const DANGEROUS_TAGS = new Set([
  'SCRIPT',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'BASE',
  'LINK',
  'META',
  'FORM',
  'APPLET'
]);

export function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
}

export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';

  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    // Basic regex fallback in non-DOM environments
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src)\s*=\s*["']?\s*javascript:[^"'>]*/gi, '$1=""');
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function cleanNode(node) {
    const children = Array.from(node.children);
    for (const child of children) {
      if (DANGEROUS_TAGS.has(child.tagName.toUpperCase())) {
        child.remove();
        continue;
      }

      // Check and sanitize all attributes
      const attrs = Array.from(child.attributes);
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        const val = attr.value.trim().toLowerCase();

        // Remove inline event handlers (onclick, onerror, onload, etc.)
        if (name.startsWith('on')) {
          child.removeAttribute(attr.name);
          continue;
        }

        // Remove dangerous URL schemes
        if (
          (name === 'href' || name === 'src' || name === 'action' || name === 'xlink:href') &&
          (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:text/html'))
        ) {
          child.removeAttribute(attr.name);
        }
      }

      cleanNode(child);
    }
  }

  cleanNode(doc.body);
  return doc.body.innerHTML;
}
