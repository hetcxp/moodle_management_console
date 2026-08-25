import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { UsersView } from '../views/UsersView';
import { AdminerApi } from '../services/adminer-api';

// Mock the API
vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getUsers: vi.fn(),
    getUsersKpis: vi.fn(),
  },
}));

describe('UsersView', () => {
  it('renders loading state initially and then shows data', async () => {
    AdminerApi.getUsers.mockResolvedValue({
      users: [
        { id: 1, fullname: 'John Doe', email: 'john@example.com', is_active: 1, lastaccess: 1690000000 }
      ],
      totalcount: 1
    });

    AdminerApi.getUsersKpis.mockResolvedValue({
      total_users: 1, active_users: 1, suspended_users: 0, avg_progress: 100
    });

    renderWithProviders(<UsersView />);
    
    // We expect the title to be there
    expect(screen.getByText('Directorio de Usuarios')).toBeDefined();

    // After loading, we should see the user
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.getByText('john@example.com')).toBeDefined();
    });
  });
});
