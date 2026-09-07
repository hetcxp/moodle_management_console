import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { CoursesView } from '../views/CoursesView';
import { AdminerApi } from '../services/adminer-api';

vi.mock('../services/adminer-api', () => import('./__mocks__/adminer-api'));

describe('CoursesView behavior tests', () => {
  const sampleCourses = [
    {
      id: 101,
      fullname: 'Matemáticas Avanzadas',
      shortname: 'MAT-ADV',
      category: 1,
      categoryname: 'Ciencias Exactas',
      visible: 1,
      enrolledcount: 25,
      completedcount: 10,
      cohortscount: 2,
      competenciescount: 4,
      progress: 40,
      timecreated: 1725148800,
    },
    {
      id: 102,
      fullname: 'Física Cuántica',
      shortname: 'FIS-CUAN',
      category: 1,
      categoryname: 'Ciencias Exactas',
      visible: 0,
      enrolledcount: 15,
      completedcount: 5,
      cohortscount: 1,
      competenciescount: 0,
      progress: 33,
      timecreated: 1725149900,
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    AdminerApi.getCourses.mockResolvedValue({
      courses: sampleCourses,
      totalcount: 2,
      kpis: {
        total_courses: 2,
        total_enrolled: 40,
        avg_progress: 37,
        empty_courses: 0
      }
    });
    AdminerApi.getCategoriesFlat.mockResolvedValue({
      categories: [{ id: 1, name: 'Ciencias Exactas' }]
    });
  });

  it('renders courses list and KPIs correctly', async () => {
    renderWithProviders(<CoursesView />);

    await waitFor(() => {
      expect(screen.getByText('Matemáticas Avanzadas')).toBeDefined();
      expect(screen.getByText('Física Cuántica')).toBeDefined();
      expect(screen.getByText('Competencias')).toBeDefined();
      expect(screen.getByText('4')).toBeDefined();
    });
  });

  it('triggers courseAction when toggling visibility', async () => {
    AdminerApi.courseAction.mockResolvedValueOnce({ success: true, affectedcount: 1 });

    renderWithProviders(<CoursesView />);

    await waitFor(() => {
      expect(screen.getByText('Matemáticas Avanzadas')).toBeDefined();
    });

    const hideButtons = screen.getAllByTitle(/Ocultar curso/i);
    if (hideButtons.length > 0) {
      fireEvent.click(hideButtons[0]);
      await waitFor(() => {
        expect(AdminerApi.courseAction).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'hide' })
        );
      });
    }
  });

  it('filters courses when typing into search input', async () => {
    renderWithProviders(<CoursesView />);

    await waitFor(() => {
      expect(screen.getByText('Matemáticas Avanzadas')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar/i);
    fireEvent.change(searchInput, { target: { value: 'Matemáticas' } });

    await waitFor(() => {
      expect(AdminerApi.getCourses).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Matemáticas' })
      );
    });
  });

  it('shows bulk action toolbar when rows are selected', async () => {
    renderWithProviders(<CoursesView />);

    await waitFor(() => {
      expect(screen.getByText('Matemáticas Avanzadas')).toBeDefined();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(1);
    // Click on the first row checkbox (index 1, as index 0 is header select-all)
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText(/elementos seleccionados/i)).toBeDefined();
      expect(screen.getByText(/Ocultar/i)).toBeDefined();
    });
  });

  it('shows success toast after hide course action', async () => {
    AdminerApi.courseAction.mockResolvedValueOnce({ success: true, affectedcount: 1 });

    renderWithProviders(<CoursesView />);

    await waitFor(() => {
      expect(screen.getByText('Matemáticas Avanzadas')).toBeDefined();
    });

    const hideButtons = screen.getAllByTitle(/Ocultar curso/i);
    expect(hideButtons.length).toBeGreaterThan(0);
    fireEvent.click(hideButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Cursos ocultados/i)).toBeDefined();
    });
  });

  it('shows error toast when courseAction rejects', async () => {
    AdminerApi.courseAction.mockRejectedValueOnce(new Error('Fallo al actualizar curso'));

    renderWithProviders(<CoursesView />);

    await waitFor(() => {
      expect(screen.getByText('Matemáticas Avanzadas')).toBeDefined();
    });

    const hideButtons = screen.getAllByTitle(/Ocultar curso/i);
    expect(hideButtons.length).toBeGreaterThan(0);
    fireEvent.click(hideButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Fallo al actualizar curso')).toBeDefined();
    });
  });
});
