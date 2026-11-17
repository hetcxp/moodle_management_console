import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShieldCheck, Layers } from 'lucide-react';
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

  it('supports client-side pagination when onPageChange is not provided', () => {
    const manyCourses = Array.from({ length: 29 }, (_, i) => ({
      id: i + 1,
      name: `Curso ${i + 1}`,
      status: 'Activo'
    }));

    render(
      <DataTable
        columns={sampleColumns}
        data={manyCourses}
      />
    );

    // Página 1 de 2: muestra los primeros 20 registros
    expect(screen.getByText('Página 1 de 2')).toBeDefined();
    expect(screen.getByText('Curso 1')).toBeDefined();
    expect(screen.getByText('Curso 20')).toBeDefined();
    expect(screen.queryByText('Curso 21')).toBeNull();

    // Navegar a la página 2
    const nextBtn = screen.getByRole('button', { name: /siguiente/i });
    fireEvent.click(nextBtn);

    // Página 2 de 2: muestra los 9 registros restantes
    expect(screen.getByText('Página 2 de 2')).toBeDefined();
    expect(screen.queryByText('Curso 1')).toBeNull();
    expect(screen.getByText('Curso 21')).toBeDefined();
    expect(screen.getByText('Curso 29')).toBeDefined();

    // Navegar de regreso a la página 1
    const prevBtn = screen.getByRole('button', { name: /anterior/i });
    fireEvent.click(prevBtn);

    expect(screen.getByText('Página 1 de 2')).toBeDefined();
    expect(screen.getByText('Curso 1')).toBeDefined();
    expect(screen.queryByText('Curso 21')).toBeNull();
  });

  it('renders sortOptions micro-buttons and triggers onSortChange with each key', () => {
    const handleSortChange = vi.fn();
    const columnsWithSortOptions = [
      {
        header: 'Estado',
        filterKey: 'suspended',
        filterType: 'select',
        filterOptions: [
          { value: '0', label: 'Activo' },
          { value: '1', label: 'Suspendido' },
        ],
        sortOptions: [
          { key: 'suspended', label: 'Estado', icon: ShieldCheck },
          { key: 'cohorts', label: 'Cohortes', icon: Layers },
        ],
        accessor: 'status',
      },
    ];

    const { rerender } = render(
      <DataTable
        columns={columnsWithSortOptions}
        data={sampleData}
        sort="suspended"
        dir="ASC"
        onSortChange={handleSortChange}
      />
    );

    const group = screen.getByRole('group', { name: 'Ordenar Estado' });
    expect(group).toBeDefined();

    const statusBtn = screen.getByRole('button', { name: 'Ordenar por Estado' });
    const cohortsBtn = screen.getByRole('button', { name: 'Ordenar por Cohortes' });

    expect(statusBtn.getAttribute('aria-pressed')).toBe('true');
    expect(cohortsBtn.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Filtrar por Estado' })).toBeDefined();

    fireEvent.click(statusBtn);
    expect(handleSortChange).toHaveBeenCalledWith('suspended', 'DESC');

    fireEvent.click(cohortsBtn);
    expect(handleSortChange).toHaveBeenCalledWith('cohorts', 'ASC');

    rerender(
      <DataTable
        columns={columnsWithSortOptions}
        data={sampleData}
        sort="cohorts"
        dir="DESC"
        onSortChange={handleSortChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Ordenar por Cohortes' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Ordenar por Estado' }).getAttribute('aria-pressed')).toBe('false');
  });
});
