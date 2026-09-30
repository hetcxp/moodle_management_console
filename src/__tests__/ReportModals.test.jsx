import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../components/ui/Toast';
import { CategoryReportModal } from '../views/reports/CategoryReportModal';
import { CohortReportModal } from '../views/reports/CohortReportModal';
import { CourseReportModal } from '../views/reports/CourseReportModal';
import { UserReportModal } from '../views/reports/UserReportModal';
import { CompetencyReportModal } from '../views/reports/CompetencyReportModal';

vi.mock('../hooks/useAdminerQueries', () => ({
  useCategoriesFlat: () => ({
    data: {
      categories: [
        { id: 1, name: 'Facultad de Ingeniería', coursecount: 12, depth: 1 },
        { id: 2, name: 'Facultad de Medicina', coursecount: 8, depth: 1 },
      ],
    },
    isLoading: false,
  }),
  useCohorts: () => ({
    data: {
      cohorts: [
        { id: 10, name: 'Cohorte 2026-A', members_count: 45 },
      ],
      totalcount: 1,
    },
    isLoading: false,
  }),
  useCourses: () => ({
    data: {
      courses: [
        { id: 101, fullname: 'Curso Avanzado', shortname: 'CAV', categoryname: 'Ingeniería', visible: 1 },
      ],
      totalcount: 1,
    },
    isLoading: false,
  }),
  useUsers: () => ({
    data: {
      users: [
        { id: 201, username: 'alopez', fullname: 'Ana Lopez', email: 'ana@example.com', is_active: 1 },
      ],
      totalcount: 1,
    },
    isLoading: false,
  }),
  useCompetencyFrameworks: () => ({
    data: {
      frameworks: [
        { id: 1, shortname: 'Marco Global' },
      ],
    },
    isLoading: false,
  }),
  useAllCompetencies: () => ({
    data: {
      competencies: [
        { id: 301, shortname: 'Pensamiento Crítico', idnumber: 'COMP-01' },
      ],
    },
    isLoading: false,
  }),
}));

describe('Report Modals', () => {
  it('renders CategoryReportModal with categories data', () => {
    render(
      <ToastProvider>
        <CategoryReportModal open={true} onClose={vi.fn()} />
      </ToastProvider>
    );
    expect(screen.getAllByText(/Categorías/i).length).toBeGreaterThan(0);
  });

  it('renders CohortReportModal with cohort data', () => {
    render(
      <ToastProvider>
        <CohortReportModal open={true} onClose={vi.fn()} />
      </ToastProvider>
    );
    expect(screen.getAllByText(/Cohortes/i).length).toBeGreaterThan(0);
  });

  it('renders CourseReportModal with course data', () => {
    render(
      <ToastProvider>
        <CourseReportModal open={true} onClose={vi.fn()} />
      </ToastProvider>
    );
    expect(screen.getAllByText(/Cursos/i).length).toBeGreaterThan(0);
  });

  it('renders UserReportModal with user data', () => {
    render(
      <ToastProvider>
        <UserReportModal open={true} onClose={vi.fn()} />
      </ToastProvider>
    );
    expect(screen.getAllByText(/Usuarios/i).length).toBeGreaterThan(0);
  });

  it('renders CompetencyReportModal with competency data', () => {
    render(
      <ToastProvider>
        <CompetencyReportModal open={true} onClose={vi.fn()} />
      </ToastProvider>
    );
    expect(screen.getAllByText(/Competencias/i).length).toBeGreaterThan(0);
  });
});
