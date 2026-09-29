import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { CourseCompetenciesTab } from '../views/courses/CourseCompetenciesTab';
import { AdminerApi } from '../services/adminer-api';

vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getCompetencyFrameworks: vi.fn(),
    getAllCompetencies: vi.fn(),
    competencyCourseAction: vi.fn(),
    moduleCompetencyAction: vi.fn(),
  },
}));

const mockFrameworks = [
  { id: 1, shortname: 'Cobrador Elite', idnumber: 'COBEL' },
  { id: 2, shortname: 'Liderazgo y Gestión', idnumber: 'LID' },
];

const mockAllCompetencies = [
  {
    id: 10,
    shortname: 'Cobrador 1',
    idnumber: 'COBEL1',
    frameworkid: 1,
    frameworkname: 'Cobrador Elite',
  },
  {
    id: 11,
    shortname: 'Cobrador 2',
    idnumber: 'COBEL2',
    frameworkid: 1,
    frameworkname: 'Cobrador Elite',
  },
  {
    id: 20,
    shortname: 'Liderazgo en acción',
    idnumber: 'LIDAC',
    frameworkid: 2,
    frameworkname: 'Liderazgo y Gestión',
  },
  {
    id: 21,
    shortname: 'Trabajo Colaborativo',
    idnumber: 'LIDTRAB',
    frameworkid: 2,
    frameworkname: 'Liderazgo y Gestión',
  },
];

describe('CourseCompetenciesTab - Framework Filter in Add Competency Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AdminerApi.getCompetencyFrameworks.mockResolvedValue({
      frameworks: mockFrameworks,
      totalcount: 2,
    });
    AdminerApi.getAllCompetencies.mockResolvedValue({
      competencies: mockAllCompetencies,
      total: 4,
    });
    AdminerApi.competencyCourseAction.mockResolvedValue({ success: true });
  });

  it('renders framework filter dropdown in "Agregar Competencia al Curso" modal and filters competencies', async () => {
    renderWithProviders(
      <CourseCompetenciesTab
        competencies={[]}
        courseId={101}
        courseFullname="Curso de Prueba"
        onNavigateToDetail={vi.fn()}
      />
    );

    // Open modal via empty state button
    const addBtn = screen.getByRole('button', { name: /agregar competencia/i });
    fireEvent.click(addBtn);

    // Verify modal title
    await waitFor(() => {
      expect(screen.getByText('Agregar Competencia al Curso')).toBeDefined();
    });

    // Verify framework filter select exists with options
    const frameworkSelect = screen.getByLabelText('Filtrar por marco de competencia');
    expect(frameworkSelect).toBeDefined();
    expect(screen.getByText('Todos los marcos')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Cobrador Elite')).toBeDefined();
      expect(screen.getByText('Liderazgo y Gestión')).toBeDefined();
    });

    // All unlinked competencies should be visible initially
    await waitFor(() => {
      expect(screen.getByText('Cobrador 1')).toBeDefined();
      expect(screen.getByText('Cobrador 2')).toBeDefined();
      expect(screen.getByText('Liderazgo en acción')).toBeDefined();
      expect(screen.getByText('Trabajo Colaborativo')).toBeDefined();
    });

    // Filter by "Cobrador Elite" (value: "1")
    fireEvent.change(frameworkSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('Cobrador 1')).toBeDefined();
      expect(screen.getByText('Cobrador 2')).toBeDefined();
      expect(screen.queryByText('Liderazgo en acción')).toBeNull();
      expect(screen.queryByText('Trabajo Colaborativo')).toBeNull();
    });

    // Search within filtered framework
    const searchInput = screen.getByPlaceholderText(/buscar competencia por nombre o código/i);
    fireEvent.change(searchInput, { target: { value: 'Cobrador 2' } });

    await waitFor(() => {
      expect(screen.queryByText('Cobrador 1')).toBeNull();
      expect(screen.getByText('Cobrador 2')).toBeDefined();
    });

    // Filter by "Liderazgo y Gestión" (value: "2") with same search should yield no results
    fireEvent.change(frameworkSelect, { target: { value: '2' } });

    await waitFor(() => {
      expect(screen.getByText('Sin resultados para los filtros aplicados.')).toBeDefined();
    });

    // Clear search and confirm Liderazgo competencies reappear
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByText('Liderazgo en acción')).toBeDefined();
      expect(screen.getByText('Trabajo Colaborativo')).toBeDefined();
      expect(screen.queryByText('Cobrador 1')).toBeNull();
    });
  });

  it('allows selecting a competency after filtering by framework and opens rule dialog', async () => {
    renderWithProviders(
      <CourseCompetenciesTab
        competencies={[]}
        courseId={101}
        courseFullname="Curso de Prueba"
        onNavigateToDetail={vi.fn()}
      />
    );

    const addBtn = screen.getByRole('button', { name: /agregar competencia/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByLabelText('Filtrar por marco de competencia')).toBeDefined();
      expect(screen.getByText('Cobrador 1')).toBeDefined();
    });

    const frameworkSelect = screen.getByLabelText('Filtrar por marco de competencia');
    fireEvent.change(frameworkSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('Cobrador 1')).toBeDefined();
    });

    // Click Cobrador 1 to select
    fireEvent.click(screen.getByText('Cobrador 1'));

    // Rule outcome dialog should open
    await waitFor(() => {
      expect(screen.getByText('Configurar Regla de Competencia')).toBeDefined();
      expect(screen.getByText('Regla al completar el curso:')).toBeDefined();
    });

    // Confirm adding
    const confirmBtn = screen.getByRole('button', { name: 'Confirmar' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(AdminerApi.competencyCourseAction).toHaveBeenCalledWith({
        action: 'add',
        competencyid: 10,
        courseids: [101],
        ruleoutcome: 3,
      });
    });
  });
});
