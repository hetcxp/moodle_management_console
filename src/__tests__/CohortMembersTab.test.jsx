import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CohortMembersTab } from '../views/cohorts/CohortMembersTab';

vi.mock('../components/PermissionGate', () => ({
  PermissionGate: ({ children }) => <>{children}</>,
  LicensedActionButton: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('../components/CsvExporter', () => ({
  exportToCsv: vi.fn(),
}));

describe('CohortMembersTab', () => {
  const sampleMembers = [
    {
      id: 201,
      fullname: 'Carlos Gomez',
      email: 'carlos@example.com',
      suspended: 0,
      lastaccess: 1700000000,
      progress: 75,
      course_progresses: [{ courseid: 10, progress: 80 }],
    },
  ];

  const sampleCourses = [
    { id: 10, fullname: 'Curso de Prueba' },
  ];

  it('renders members, triggers unlink, selector, and exports CSV', () => {
    const setSelectorType = vi.fn();
    const handleUnlinkUser = vi.fn();
    const handleBulkUnlinkUsers = vi.fn();
    const onNavigateToDetail = vi.fn();

    render(
      <CohortMembersTab
        members={sampleMembers}
        courses={sampleCourses}
        cohortName="Cohorte 2026"
        loading={false}
        setSelectorType={setSelectorType}
        handleUnlinkUser={handleUnlinkUser}
        handleBulkUnlinkUsers={handleBulkUnlinkUsers}
        onNavigateToDetail={onNavigateToDetail}
      />
    );

    expect(screen.getByText('Carlos Gomez')).toBeDefined();
    expect(screen.getByText('carlos@example.com')).toBeDefined();

    // Selector
    fireEvent.click(screen.getByText(/Añadir Usuario\(s\)/i));
    expect(setSelectorType).toHaveBeenCalledWith('users');

    // Single unlink
    fireEvent.click(screen.getByTitle('Remover de la cohorte'));
    expect(handleUnlinkUser).toHaveBeenCalledWith(201);

    // Export CSV dialog
    fireEvent.click(screen.getByText('Exportar CSV'));
    expect(screen.getByText('Opciones de Exportación')).toBeDefined();
    const exportButtons = screen.getAllByText('Exportar CSV');
    fireEvent.click(exportButtons[exportButtons.length - 1]);

    // Open detail dialog
    fireEvent.click(screen.getByText('Carlos Gomez'));
    expect(screen.getByText(/Cursos de: Carlos Gomez/i)).toBeDefined();
    fireEvent.click(screen.getByText('Ir al Detalle del Usuario'));
    expect(onNavigateToDetail).toHaveBeenCalledWith('user', 201);
  });
});
