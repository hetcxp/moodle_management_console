import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureViewport } from '../feedbackCapture';
import html2canvas from 'html2canvas';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

describe('captureViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures viewport targeting document.body with adaptive scale', async () => {
    const mockToDataURL = vi.fn().mockReturnValue('data:image/webp;base64,mockedwebp');
    html2canvas.mockResolvedValue({
      toDataURL: mockToDataURL,
    });

    const result = await captureViewport();

    expect(html2canvas).toHaveBeenCalledWith(
      document.body,
      expect.objectContaining({
        scale: expect.any(Number),
        useCORS: true,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      })
    );
    expect(mockToDataURL).toHaveBeenCalledWith('image/webp', 0.8);
    expect(result).toBe('data:image/webp;base64,mockedwebp');
  });

  it('falls back to JPEG if WebP is unsupported or returns invalid format', async () => {
    const mockToDataURL = vi.fn().mockImplementation((type) => {
      if (type === 'image/webp') return '';
      return 'data:image/jpeg;base64,mockedjpeg';
    });
    html2canvas.mockResolvedValue({
      toDataURL: mockToDataURL,
    });

    const result = await captureViewport();
    expect(result).toBe('data:image/jpeg;base64,mockedjpeg');
  });

  it('handles html2canvas failures gracefully without throwing', async () => {
    html2canvas.mockRejectedValue(new Error('Canvas security error'));

    const result = await captureViewport();
    expect(result).toBe('');
  });

  it('excludes password fields and ignored elements via ignoreElements predicate', async () => {
    let capturedOptions;
    html2canvas.mockImplementation((_, opts) => {
      capturedOptions = opts;
      return Promise.resolve({
        toDataURL: () => 'data:image/webp;base64,ok',
      });
    });

    await captureViewport();
    expect(capturedOptions?.ignoreElements).toBeDefined();

    const ignoredEl = { hasAttribute: (attr) => attr === 'data-feedback-ignore', classList: { contains: () => false }, getAttribute: () => null };
    const passwordEl = { hasAttribute: () => false, classList: { contains: () => false }, getAttribute: (attr) => attr === 'type' ? 'password' : null };
    const fabEl = { hasAttribute: () => false, classList: { contains: (cls) => cls === 'feedback-fab-container' }, getAttribute: () => null };
    const regularEl = { hasAttribute: () => false, classList: { contains: () => false }, getAttribute: () => null };

    expect(capturedOptions.ignoreElements(ignoredEl)).toBe(true);
    expect(capturedOptions.ignoreElements(passwordEl)).toBe(true);
    expect(capturedOptions.ignoreElements(fabEl)).toBe(true);
    expect(capturedOptions.ignoreElements(regularEl)).toBe(false);
  });
});
