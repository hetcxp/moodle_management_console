import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { DashboardView } from '../views/DashboardView';
import { AdminerApi } from '../services/adminer-api';

// Mock the API
vi.mock('../services/adminer-api', () => import('./__mocks__/adminer-api'));

describe('DashboardView', () => {
  it('renders correctly with stats', async () => {
    AdminerApi.getDashboard.mockResolvedValue({
      courses_total: 50,
      courses_active: 40,
      courses_inactive: 10,
      users_total: 150,
      users_active: 100,
      users_suspended: 50,
      cohorts_total: 10,
      categories_total: 5,
      competencies_total: 20,
      pending_reviews_total: 3,
    });

    renderWithProviders(<DashboardView />);
    
    // Check title
    expect(screen.getByText('Resumen General')).toBeDefined();
  });
});
