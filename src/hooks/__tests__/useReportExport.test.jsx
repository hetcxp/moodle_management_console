import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useReportExport } from '../useReportExport';
import { ToastProvider } from '../../components/ui/Toast';
import * as CsvExporterModule from '../../components/CsvExporter';

vi.mock('../../components/CsvExporter', () => ({
  exportToCsv: vi.fn(),
}));

describe('useReportExport hook', () => {
  const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>;

  it('initializes with exporting=false', () => {
    const { result } = renderHook(
      () =>
        useReportExport({
          fetchDetail: vi.fn(),
          processDetail: vi.fn(),
          columns: [],
          filename: 'test',
        }),
      { wrapper }
    );

    expect(result.current.exporting).toBe(false);
    expect(typeof result.current.handleExport).toBe('function');
  });

  it('successfully exports rows and invokes onClose', async () => {
    const fetchDetail = vi.fn().mockImplementation((id) => Promise.resolve({ id, name: `Name ${id}` }));
    const processDetail = vi.fn((detail, rows) => rows.push(detail));
    const onClose = vi.fn();
    const columns = [{ label: 'ID', accessor: 'id' }];

    const { result } = renderHook(
      () =>
        useReportExport({
          fetchDetail,
          processDetail,
          columns,
          filename: 'test_file',
          chunkSize: 2,
          onClose,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.handleExport([1, 2]);
    });

    expect(fetchDetail).toHaveBeenCalledTimes(2);
    expect(processDetail).toHaveBeenCalledTimes(2);
    expect(CsvExporterModule.exportToCsv).toHaveBeenCalledWith(
      'test_file',
      [{ id: 1, name: 'Name 1' }, { id: 2, name: 'Name 2' }],
      columns
    );
    expect(onClose).toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
  });

  it('handles empty results without calling exportToCsv', async () => {
    const fetchDetail = vi.fn().mockResolvedValue(null);
    const processDetail = vi.fn();
    const onClose = vi.fn();

    const { result } = renderHook(
      () =>
        useReportExport({
          fetchDetail,
          processDetail,
          columns: [],
          filename: 'empty',
          onClose,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.handleExport([1]);
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
  });
});
