import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BaseReportModal } from '../components/ui/BaseReportModal';
import { ToastProvider } from '../components/ui/Toast';

// Mock dependencies
vi.mock('../components/CsvExporter', () => ({
  exportToCsv: vi.fn(),
}));

describe('BaseReportModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    description: 'Test description',
    search: '',
    setSearch: vi.fn(),
    page: 0,
    setPage: vi.fn(),
    totalPages: 1,
    loading: false,
    data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
    emptyTitle: 'Empty',
    emptyMessage: 'No data',
    renderItem: (item) => <div>{item.name}</div>,
    fetchDetail: vi.fn().mockResolvedValue({ info: 'test' }),
    processDetail: vi.fn((detail, csvRows) => csvRows.push({ ...detail })),
    columns: [{ label: 'Info', accessor: 'info' }],
    filename: 'test_export',
  };

  const renderWithToast = (ui) => render(
    <ToastProvider>
      {ui}
    </ToastProvider>
  );

  it('renders correctly', () => {
    renderWithToast(<BaseReportModal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeDefined();
    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('Item 2')).toBeDefined();
  });

  it('triggers export and handles chunks', async () => {
    const fetchDetailMock = vi.fn().mockResolvedValue({ info: 'test data' });
    const processDetailMock = vi.fn((detail, csvRows) => csvRows.push({ info: detail.info }));

    renderWithToast(
      <BaseReportModal 
        {...defaultProps} 
        fetchDetail={fetchDetailMock} 
        processDetail={processDetailMock} 
      />
    );

    // Seleccionar todos (usando el checkbox del header)
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    // Clic en exportar
    const exportButton = screen.getByRole('button', { name: /Exportar Detalle/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      // Debería haberse llamado dos veces (1 por cada ID seleccionado)
      expect(fetchDetailMock).toHaveBeenCalledTimes(2);
      expect(processDetailMock).toHaveBeenCalledTimes(2);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
