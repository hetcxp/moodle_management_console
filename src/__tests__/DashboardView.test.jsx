import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { DashboardView } from '../views/DashboardView';
import { AdminerApi } from '../services/adminer-api';

// Mock the API
vi.mock('../services/adminer-api', () => import('./__mocks__/adminer-api'));

describe('DashboardView', () => {
  it('renders correctly with stats and KPI cards', async () => {
    AdminerApi.getDashboard.mockResolvedValue({
      courses_total: 50,
      courses_active: 40,
      courses_inactive: 10,
      users_total: 150,
      users_active: 100,
      users_inactive: 50,
      cohorts_total: 10,
      cohorts_users_total: 25,
      categories_total: 5,
      competencies_total: 20,
      pending_reviews_total: 3,
    });

    renderWithProviders(<DashboardView />);
    
    // Check header
    expect(screen.getByText('Resumen General')).toBeDefined();
    expect(screen.getByText('Métricas ejecutivas y monitoreo en tiempo real')).toBeDefined();
    expect(screen.getByRole('button', { name: /Actualizar/i })).toBeDefined();

    // Check KPI titles and rendered stats
    expect(await screen.findByText('150')).toBeDefined();
    expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cursos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Usuarios').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cohortes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Categorías').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Visibles').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Activos').length).toBeGreaterThanOrEqual(1);
  });
});
