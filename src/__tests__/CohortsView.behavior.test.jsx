import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { CohortsView } from '../views/CohortsView';
import { AdminerApi } from '../services/adminer-api';

vi.mock('../services/adminer-api', () => import('./__mocks__/adminer-api'));

describe('CohortsView behavior tests', () => {
  const sampleCohorts = [
    {
      id: 1,
      name: 'Cohorte Alfa',
      idnumber: 'COH-A',
      memberscount: 15,
      coursescount: 2,
      description: 'Grupo Alfa 2026',
    },
    {
      id: 2,
      name: 'Cohorte Beta',
      idnumber: 'COH-B',
      memberscount: 0,
      coursescount: 1,
      description: 'Grupo Beta 2026',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    AdminerApi.getCohorts.mockResolvedValue({
      cohorts: sampleCohorts,
      totalcount: 2,
    });
    AdminerApi.getCohortsKpis.mockResolvedValue({
      total_cohorts: 2,
      total_members: 15,
      empty_cohorts: 1,
      synced_courses: 3,
    });
  });

  it('renders cohorts list and metrics correctly', async () => {
    renderWithProviders(<CohortsView />);

    await waitFor(() => {
      expect(screen.getByText('Cohorte Alfa')).toBeDefined();
      expect(screen.getByText('Cohorte Beta')).toBeDefined();
      expect(screen.getByText('15 miembros')).toBeDefined();
    });
  });

  it('filters cohorts when typing into search input', async () => {
    renderWithProviders(<CohortsView />);

    await waitFor(() => {
      expect(screen.getByText('Cohorte Alfa')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre de cohorte/i);
    fireEvent.change(searchInput, { target: { value: 'Alfa' } });

    await waitFor(() => {
      expect(AdminerApi.getCohorts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Alfa' })
      );
    });
  });

  it('opens create cohort modal and submits new cohort', async () => {
    AdminerApi.cohortAction.mockResolvedValueOnce({ success: true, affectedcount: 1 });

    renderWithProviders(<CohortsView />);

    await waitFor(() => {
      expect(screen.getByText('Cohorte Alfa')).toBeDefined();
    });

    const createButton = screen.getByRole('button', { name: /Nueva Cohorte/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Configura los detalles del grupo.')).toBeDefined();
    });

    const requiredInputs = document.querySelectorAll('input[required]');
    expect(requiredInputs.length).toBeGreaterThan(0);
    fireEvent.change(requiredInputs[0], { target: { value: 'Cohorte Gamma' } });

    const submitButton = screen.getByRole('button', { name: /Crear Cohorte/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(AdminerApi.cohortAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          name: 'Cohorte Gamma',
        })
      );
    });
  });

  it('triggers delete confirmation dialog and executes delete action', async () => {
    AdminerApi.cohortAction.mockResolvedValueOnce({ success: true, affectedcount: 1 });

    renderWithProviders(<CohortsView />);

    await waitFor(() => {
      expect(screen.getByText('Cohorte Alfa')).toBeDefined();
    });

    const deleteButtons = screen.getAllByTitle(/Eliminar cohorte/i);
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/¿Eliminar cohorte\(s\)\?/i)).toBeDefined();
    });

    const confirmButton = screen.getByRole('button', { name: /Sí, eliminar/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(AdminerApi.cohortAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
        })
      );
    });
  });

  it('shows bulk action toolbar when rows are selected', async () => {
    renderWithProviders(<CohortsView />);

    await waitFor(() => {
      expect(screen.getByText('Cohorte Alfa')).toBeDefined();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    // Row 1 checkbox is at index 1
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText(/elementos seleccionados/i)).toBeDefined();
    });
  });
});
