import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCsv } from '../CsvExporter';

describe('exportToCsv', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers alert and aborts if rows array is empty or undefined', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    exportToCsv('test', [], [{ label: 'ID', accessor: 'id' }]);
    expect(alertSpy).toHaveBeenCalledWith('No hay datos para exportar');

    exportToCsv('test', null, [{ label: 'ID', accessor: 'id' }]);
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });

  it('correctly constructs CSV with BOM, escapes quotes, and triggers link download', async () => {
    let capturedBlob = null;
    let clickedHref = null;
    let clickedDownload = null;

    window.URL.createObjectURL = vi.fn().mockImplementation((blob) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    });
    window.URL.revokeObjectURL = vi.fn();

    const mockClick = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const el = origCreateElement(tagName);
      if (tagName === 'a') {
        el.click = mockClick;
        const origSetAttribute = el.setAttribute.bind(el);
        el.setAttribute = (attr, val) => {
          if (attr === 'href') clickedHref = val;
          if (attr === 'download') clickedDownload = val;
          origSetAttribute(attr, val);
        };
      }
      return el;
    });

    const columns = [
      { label: 'Name "Special"', accessor: 'name' },
      { label: 'Score', accessor: (row) => row.score * 10 },
      { label: 'Notes', accessor: 'notes' },
    ];

    const rows = [
      { name: 'Alice "The Boss"', score: 9, notes: null },
      { name: 'Bob, Builder', score: 8, notes: undefined },
    ];

    exportToCsv('report_export', rows, columns);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(clickedHref).toBe('blob:mock-url');
    expect(clickedDownload).toMatch(/^report_export_\d{4}-\d{2}-\d{2}\.csv$/);

    expect(capturedBlob).toBeDefined();
    const buffer = await capturedBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Verify UTF-8 BOM (0xEF, 0xBB, 0xBF)
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const text = await capturedBlob.text();
    expect(text).toContain('"Name ""Special"""');
    expect(text).toContain('"Alice ""The Boss"""');
    expect(text).toContain('"90"');
    expect(text).toContain('""');
    expect(text).toContain('"Bob, Builder"');
  });
});
