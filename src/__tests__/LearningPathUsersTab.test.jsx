import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LearningPathUsersTab } from '../views/learning_paths/LearningPathUsersTab';

vi.mock('../hooks/useAdminerQueries', () => ({
  useUsers: () => ({
    data: {
      users: [
        { id: 99, fullname: 'Usuario Candidato', email: 'cand@test.com' },
      ],
    },
    isLoading: false,
  }),
}));

describe('LearningPathUsersTab', () => {
  const mockPath = {
    users: [
      { id: 10, fullname: 'Carlos Pérez', email: 'carlos@test.com', enrol_method: 'manual', status: 0 },
    ],
  };

  it('renders enrolled users list and search input', () => {
    const onAssignUsers = vi.fn();
    const onRemoveUser = vi.fn();

    render(
      <LearningPathUsersTab
        path={mockPath}
        onAssignUsers={onAssignUsers}
        onRemoveUser={onRemoveUser}
      />
    );

    expect(screen.getByText('Carlos Pérez')).toBeDefined();
    expect(screen.getByText('carlos@test.com')).toBeDefined();

    const searchInput = screen.getByPlaceholderText(/Buscar matriculado/i);
    expect(searchInput).toBeDefined();

    const addBtn = screen.getByTitle('Matricular Usuario(s)');
    fireEvent.click(addBtn);

    expect(screen.getByText('Matricular Usuarios en la Ruta')).toBeDefined();
  });

  it('renders empty message when no users are enrolled', () => {
    render(
      <LearningPathUsersTab
        path={{ users: [] }}
        onAssignUsers={vi.fn()}
        onRemoveUser={vi.fn()}
      />
    );

    expect(screen.getByText(/No hay usuarios matriculados en esta ruta/i)).toBeDefined();
  });
});
