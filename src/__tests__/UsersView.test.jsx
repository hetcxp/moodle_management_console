import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { UsersView } from '../views/UsersView';
import { AdminerApi } from '../services/adminer-api';
import { useUsers, useUsersKpis } from '../hooks/useAdminerQueries';

// Mock the API
vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getUsers: vi.fn().mockResolvedValue({ users: [], totalcount: 0 }),
    getUsersKpis: vi.fn().mockResolvedValue({ total_users: 0, active_users: 0, suspended_users: 0, avg_progress: 0 }),
  },
}));


describe('UsersView', () => {
  it('renders correctly', () => {
    renderWithProviders(<UsersView />);
    
    // We expect the title to be there
    expect(screen.getByText('Directorio de Usuarios')).toBeDefined();
  });
});
