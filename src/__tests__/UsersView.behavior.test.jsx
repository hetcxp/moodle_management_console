import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { UsersView } from '../views/UsersView';
import { AdminerApi } from '../services/adminer-api';

vi.mock('../services/adminer-api', () => import('./__mocks__/adminer-api'));

describe('UsersView behavior tests', () => {
  const sampleUsers = [
    {
      id: 201,
      username: 'jdoe',
      firstname: 'John',
      lastname: 'Doe',
      fullname: 'John Doe',
      email: 'jdoe@example.com',
      suspended: 0,
      is_active: 1,
      is_admin: 0,
      lastaccess: 1725148800,
      cohorts_count: 2,
      enrolled_courses: 3,
      completed_courses: 2,
      progress: 67
    },
    {
      id: 202,
      username: 'jsmith',
      firstname: 'Jane',
      lastname: 'Smith',
      fullname: 'Jane Smith',
      email: 'jsmith@example.com',
      suspended: 1,
      is_active: 0,
      is_admin: 0,
      lastaccess: 1725140000,
      cohorts_count: 1,
      enrolled_courses: 1,
      completed_courses: 0,
      progress: 0
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    AdminerApi.getUsers.mockResolvedValue({
      users: sampleUsers,
      totalcount: 2,
    });
    AdminerApi.getUsersKpis.mockResolvedValue({
      total_users: 2,
      active_users: 1,
      suspended_users: 1,
      recent_active: 1,
      avg_progress: 33.5
    });
  });

  it('renders users list and executes search query', async () => {
    renderWithProviders(<UsersView />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.getByText('Jane Smith')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(AdminerApi.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'John' })
      );
    });
  });

  it('triggers user suspend/activate action', async () => {
    AdminerApi.userAction.mockResolvedValueOnce({ success: true, affectedcount: 1 });

    renderWithProviders(<UsersView />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
    });

    const suspendBtn = screen.getByTitle('Suspender usuario');
    fireEvent.click(suspendBtn);

    await waitFor(() => {
      expect(AdminerApi.userAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'suspend',
          userids: [201]
        })
      );
    });
  });

  it('shows bulk action toolbar when rows are selected', async () => {
    renderWithProviders(<UsersView />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(1);
    // Click on the first row checkbox (index 1, as index 0 is header select-all)
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText(/elementos seleccionados/i)).toBeDefined();
    });
  });

  it('shows success toast after suspend action', async () => {
    AdminerApi.userAction.mockResolvedValueOnce({ success: true, affectedcount: 1 });

    renderWithProviders(<UsersView />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
    });

    const suspendBtn = screen.getByTitle('Suspender usuario');
    fireEvent.click(suspendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Usuarios suspendidos/i)).toBeDefined();
    });
  });

  it('shows error toast when userAction rejects', async () => {
    AdminerApi.userAction.mockRejectedValueOnce(new Error('Fallo al suspender usuario'));

    renderWithProviders(<UsersView />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
    });

    const suspendBtn = screen.getByTitle('Suspender usuario');
    fireEvent.click(suspendBtn);

    await waitFor(() => {
      expect(screen.getByText('Fallo al suspender usuario')).toBeDefined();
    });
  });
});
