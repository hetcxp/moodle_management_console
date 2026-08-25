import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { DashboardView } from '../views/DashboardView';
import { AdminerApi } from '../services/adminer-api';

// Mock the API
vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getDashboard: vi.fn(),
  },
}));

describe('DashboardView', () => {
  it('renders loading state initially', () => {
    // Setup mock to return a promise that doesn't resolve immediately
    AdminerApi.getDashboard.mockImplementation(() => new Promise(() => {}));
    
    renderWithProviders(<DashboardView />);
    expect(screen.getByText('Panel de Control')).toBeDefined();
    // It should show skeleton/loading states for the KPIs
  });

  it('renders KPIs successfully', async () => {
    const mockData = {
      users: { total: 150, active: 100 },
      courses: { total: 20 },
      cohorts: { total: 5 },
      progress: { average: 75 },
    };
    
    AdminerApi.getDashboard.mockResolvedValue(mockData);

    renderWithProviders(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeDefined(); // Total users
      expect(screen.getByText('100')).toBeDefined(); // Active users
      expect(screen.getByText('20')).toBeDefined(); // Total courses
      expect(screen.getByText('5')).toBeDefined(); // Total cohorts
    });
  });
});
