import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizer.js';

/**
 * Component for safely rendering rich HTML while stripping executable scripts and event handlers.
 */
export function SafeHtml({ html, className = '', as: Component = 'div', ...props }) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  const clean = sanitizeHtml(html);

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
      {...props}
    />
  );
}
