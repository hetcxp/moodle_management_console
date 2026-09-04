import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '../components/DataTable';

describe('DataTable component', () => {
  const sampleColumns = [
    { header: 'ID', accessor: 'id', sortKey: 'id' },
    { header: 'Nombre', accessor: 'name', sortKey: 'name' },
    { header: 'Estado', accessor: 'status' },
  ];

  const sampleData = [
    { id: 1, name: 'Curso Alfa', status: 'Activo' },
    { id: 2, name: 'Curso Beta', status: 'Inactivo' },
  ];

  it('renders table headers and data rows correctly', () => {
    render(
      <DataTable
        columns={sampleColumns}
        data={sampleData}
        totalCount={2}
      />
    );

    expect(screen.getByText('Nombre')).toBeDefined();
    expect(screen.getByText('Curso Alfa')).toBeDefined();
    expect(screen.getByText('Curso Beta')).toBeDefined();
    expect(screen.getByText('Activo')).toBeDefined();
  });

  it('shows empty message when data is empty and not loading', () => {
    render(
      <DataTable
        columns={sampleColumns}
        data={[]}
        totalCount={0}
        emptyMessage="No hay cursos disponibles"
      />
    );

    expect(screen.getByText('No hay cursos disponibles')).toBeDefined();
  });

  it('triggers onSortChange when clicking sortable column header', () => {
    const handleSortChange = vi.fn();

    render(
      <DataTable
        columns={sampleColumns}
        data={sampleData}
        sort="name"
        dir="ASC"
        onSortChange={handleSortChange}
      />
    );

    const nameHeader = screen.getByText('Nombre');
    fireEvent.click(nameHeader);

    expect(handleSortChange).toHaveBeenCalledWith('name', 'DESC');
  });

  it('supports row selection and select-all functionality', () => {
    const handleSelectionChange = vi.fn();

    const { rerender } = render(
      <DataTable
        columns={sampleColumns}
        data={sampleData}
        selectable={true}
        selectedIds={[]}
        onSelectionChange={handleSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Index 0 is select-all header checkbox
    fireEvent.click(checkboxes[0]);
    expect(handleSelectionChange).toHaveBeenCalledWith([1, 2]);

    // Select single row (row 1, checkbox index 1)
    fireEvent.click(checkboxes[1]);
    expect(handleSelectionChange).toHaveBeenCalledWith([1]);

    // Re-render with selection to test deselect all
    rerender(
      <DataTable
        columns={sampleColumns}
        data={sampleData}
        selectable={true}
        selectedIds={[1, 2]}
        onSelectionChange={handleSelectionChange}
      />
    );

    const updatedCheckboxes = screen.getAllByRole('checkbox');
    fireEvent.click(updatedCheckboxes[0]);
    expect(handleSelectionChange).toHaveBeenCalledWith([]);
  });

  it('triggers onRowClick when row is clicked', () => {
    const handleRowClick = vi.fn();

    render(
      <DataTable
        columns={sampleColumns}
        data={sampleData}
        onRowClick={handleRowClick}
      />
    );

    const rowCell = screen.getByText('Curso Alfa');
    fireEvent.click(rowCell);

    expect(handleRowClick).toHaveBeenCalledWith(sampleData[0]);
  });
});
