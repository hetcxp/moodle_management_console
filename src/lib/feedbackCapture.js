import html2canvas from 'html2canvas';

/**
 * Captures the current visible viewport into a WebP or JPEG data URL.
 *
 * Target: document.body
 * Viewport settings: windowWidth, windowHeight, scrollX, scrollY, width, height
 * Scale: adaptive up to 2x for Retina displays
 * Ignores: password fields, [data-feedback-ignore], .feedback-fab-container, .no-capture
 *
 * @param {Object} [options] - Optional custom options to pass to html2canvas
 * @returns {Promise<string>} Base64 data URL of screenshot or empty string if failed
 */
export async function captureViewport(options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return '';
  }

  try {
    const target = options.target || document.body;
    if (!target) return '';

    const dpr = typeof window.devicePixelRatio === 'number' && window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;
    const scale = options.scale !== undefined ? options.scale : Math.min(dpr, 2);

    const defaultIgnore = (el) =>
      el.hasAttribute?.('data-feedback-ignore') ||
      el.classList?.contains('feedback-fab-container') ||
      el.getAttribute?.('type') === 'password' ||
      el.classList?.contains('no-capture');

    const ignoreElements = (el) => {
      if (typeof options.ignoreElements === 'function' && options.ignoreElements(el)) {
        return true;
      }
      return defaultIgnore(el);
    };

    const canvas = await html2canvas(target, {
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      ...options,
      ignoreElements,
    });

    let screenshotData = canvas.toDataURL('image/webp', 0.8);
    // Fallback if browser doesn't support webp encoding on canvas
    if (!screenshotData || !screenshotData.startsWith('data:image/webp')) {
      screenshotData = canvas.toDataURL('image/jpeg', 0.8);
    }
    return screenshotData || '';
  } catch (err) {
    // Non-fatal: if screenshot fails, return empty string to prevent blocking the feedback flow
    // eslint-disable-next-line no-console
    console.warn('Screenshot capture failed or skipped:', err);
    return '';
  }
}

export default captureViewport;
