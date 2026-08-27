import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { DashboardView } from '../views/DashboardView';
import { AdminerApi } from '../services/adminer-api';
import { useDashboardKpis } from '../hooks/useAdminerQueries';

// Mock the API
vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getDashboardKpis: vi.fn(),
    getRecentActivity: vi.fn(),
  },
}));

vi.mock('../hooks/useAdminerQueries', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useDashboardKpis: vi.fn(),
  };
});

describe('DashboardView', () => {
  it('renders correctly', () => {
    useDashboardKpis.mockReturnValue({
      data: { total_users: 150, total_courses: 50, active_users: 100, total_cohorts: 10, users_trend: 5, courses_trend: 2, active_trend: 10, cohorts_trend: 0 },
      isLoading: false
    });
    AdminerApi.getRecentActivity.mockResolvedValue([]);

    renderWithProviders(<DashboardView />);
    
    // Check title
    expect(screen.getByText('Resumen General')).toBeDefined();
  });
});
