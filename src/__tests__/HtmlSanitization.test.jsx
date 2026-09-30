import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { sanitizeHtml, stripHtml, sanitizeUrl } from '../lib/sanitizer.js';
import { SafeHtml } from '../components/ui/SafeHtml.jsx';

describe('HTML Sanitization (TD-SEC-001)', () => {
  it('strips <script> tags completely', () => {
    const dirty = '<p>Hello <script>alert("xss")</script>World</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert("xss")');
    expect(clean).toContain('Hello');
    expect(clean).toContain('World');
  });

  it('strips inline event handlers like onerror and onload', () => {
    const dirty = '<img src="invalid-img.jpg" onerror="alert(1)" onload="fetch(\'/steal\')" alt="Test" />';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('onload');
    expect(clean).not.toContain('alert(1)');
    expect(clean).toContain('src="invalid-img.jpg"');
  });

  it('strips javascript: and vbscript: URIs from links', () => {
    const dirty = '<a href="javascript:alert(1)">Click me</a><a href="https://example.com">Safe</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('javascript:alert(1)');
    expect(clean).toContain('href="https://example.com"');
  });

  it('preserves safe formatting HTML tags', () => {
    const safeHtml = '<p><strong>Bold</strong>, <em>Italic</em> and <u>Underline</u></p>';
    const clean = sanitizeHtml(safeHtml);
    expect(clean).toContain('<strong>Bold</strong>');
    expect(clean).toContain('<em>Italic</em>');
  });

  it('stripHtml removes all HTML tags returning plain text', () => {
    const html = '<h1>Title</h1><p>Some paragraph with <a href="#">link</a>.</p>';
    expect(stripHtml(html)).toBe('TitleSome paragraph with link.');
  });

  it('SafeHtml component renders sanitized HTML without executable sinks', () => {
    const dirty = '<span>Safe text <img src="x" onerror="evil()" /></span>';
    const { container } = render(<SafeHtml html={dirty} className="custom-class" />);

    expect(container.querySelector('.custom-class')).not.toBeNull();
    expect(container.innerHTML).toContain('Safe text');
    expect(container.innerHTML).not.toContain('onerror');
    expect(container.innerHTML).not.toContain('evil()');
  });
});

describe('URL Sanitization (TD-URL-001)', () => {
  it('allows valid HTTPS and HTTP URLs', () => {
    expect(sanitizeUrl('https://moodle.org/mod/assign/view.php?id=123')).toBe('https://moodle.org/mod/assign/view.php?id=123');
    expect(sanitizeUrl('http://localhost:8000/evidence.pdf')).toBe('http://localhost:8000/evidence.pdf');
  });

  it('allows safe root-relative paths', () => {
    expect(sanitizeUrl('/pluginfile.php/123/mod_assign/intro/cert.pdf')).toBe('/pluginfile.php/123/mod_assign/intro/cert.pdf');
    expect(sanitizeUrl('/my/dashboard')).toBe('/my/dashboard');
  });

  it('rejects javascript: and vbscript: schemes', () => {
    expect(sanitizeUrl('javascript:alert(document.cookie)')).toBeNull();
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBeNull();
    expect(sanitizeUrl('  javascript:void(0)  ')).toBeNull();
    expect(sanitizeUrl('vbscript:msgbox("test")')).toBeNull();
  });

  it('rejects data: URIs and file: schemes', () => {
    expect(sanitizeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBeNull();
    expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects protocol-relative URLs preventing open redirect', () => {
    expect(sanitizeUrl('//attacker.example.com/phishing')).toBeNull();
    expect(sanitizeUrl('//evil.com')).toBeNull();
  });

  it('rejects control characters, newlines, and null/empty inputs', () => {
    expect(sanitizeUrl('')).toBeNull();
    expect(sanitizeUrl(null)).toBeNull();
    expect(sanitizeUrl(undefined)).toBeNull();
    expect(sanitizeUrl('https://example.com\r\ninvalid')).toBeNull();
    expect(sanitizeUrl('https://example.com\x00evil')).toBeNull();
  });
});
