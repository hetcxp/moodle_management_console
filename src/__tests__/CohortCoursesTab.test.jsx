import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CohortCoursesTab } from '../views/cohorts/CohortCoursesTab';

vi.mock('../components/PermissionGate', () => ({
  PermissionGate: ({ children }) => <>{children}</>,
  LicensedActionButton: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

describe('CohortCoursesTab', () => {
  const sampleCourses = [
    { id: 101, fullname: 'Curso de Arquitectura', shortname: 'ARQ101', enrolledcount: 25, progress: 80 },
  ];

  const sampleMembers = [
    { id: 1, fullname: 'Maria Perez', email: 'maria@example.com', course_progresses: [{ courseid: 101, progress: 90 }] },
  ];

  it('renders courses list, synchronizes, unlinks, and opens detail dialog', () => {
    const setSelectorType = vi.fn();
    const handleUnlinkCourse = vi.fn();
    const handleBulkUnlinkCourses = vi.fn();
    const onNavigateToDetail = vi.fn();

    render(
      <CohortCoursesTab
        courses={sampleCourses}
        members={sampleMembers}
        loading={false}
        setSelectorType={setSelectorType}
        handleUnlinkCourse={handleUnlinkCourse}
        handleBulkUnlinkCourses={handleBulkUnlinkCourses}
        onNavigateToDetail={onNavigateToDetail}
      />
    );

    expect(screen.getByText('Curso de Arquitectura')).toBeDefined();
    expect(screen.getByText('ARQ101')).toBeDefined();

    // Sincronizar button
    fireEvent.click(screen.getByText(/Sincronizar Curso/i));
    expect(setSelectorType).toHaveBeenCalledWith('courses');

    // Desvincular button
    fireEvent.click(screen.getByTitle('Desvincular curso'));
    expect(handleUnlinkCourse).toHaveBeenCalledWith(101);

    // Open row detail dialog
    fireEvent.click(screen.getByText('Curso de Arquitectura'));
    expect(screen.getByText(/Progreso en: Curso de Arquitectura/i)).toBeDefined();
    expect(screen.getByText('Maria Perez')).toBeDefined();

    // Navigate to course detail
    fireEvent.click(screen.getByText('Ir al Detalle del Curso'));
    expect(onNavigateToDetail).toHaveBeenCalledWith('course', 101);
  });
});
