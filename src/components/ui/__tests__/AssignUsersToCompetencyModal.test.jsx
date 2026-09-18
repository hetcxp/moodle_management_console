import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssignUsersToCompetencyModal } from '../AssignUsersToCompetencyModal';
import { AdminerApi } from '../../../services/adminer-api';
import { ToastProvider } from '../Toast';

vi.mock('../../../services/adminer-api', () => ({
  AdminerApi: {
    getUsers: vi.fn(),
  },
}));

const mockUsers = [
  {
    id: 10,
    fullname: 'Juan Perez',
    email: 'juan@test.com',
    idnumber: 'USR-10',
  },
  {
    id: 20,
    fullname: 'Maria Gomez',
    email: 'maria@test.com',
    idnumber: 'USR-20',
  },
  {
    id: 30,
    fullname: 'Carlos Lopez',
    email: 'carlos@test.com',
    idnumber: 'USR-30',
  },
];

function renderModal(props = {}) {
  return render(
    <ToastProvider>
      <AssignUsersToCompetencyModal
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        assignedUserIds={[]}
        loading={false}
        competencyName="Resolución de Problemas"
        {...props}
      />
    </ToastProvider>
  );
}

describe('AssignUsersToCompetencyModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AdminerApi.getUsers.mockResolvedValue({ users: mockUsers, totalcount: 3 });
  });

  it('renders modal with users list and competency title', async () => {
    renderModal();

    expect(screen.getByText('Vincular Usuarios a la Competencia')).toBeDefined();
    expect(
      screen.getByText(/Selecciona los usuarios a los que deseas asignar la competencia "Resolución de Problemas"/i)
    ).toBeDefined();

    await waitFor(() => {
      expect(AdminerApi.getUsers).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeDefined();
      expect(screen.getByText('Maria Gomez')).toBeDefined();
      expect(screen.getByText('Carlos Lopez')).toBeDefined();
    });
  });

  it('marks already assigned users as disabled with "Ya vinculado" badge', async () => {
    renderModal({ assignedUserIds: [20] });

    await waitFor(() => {
      expect(screen.getByText('Maria Gomez')).toBeDefined();
    });

    expect(screen.getByText('Ya vinculado')).toBeDefined();

    const mariaBtn = screen.getByText('Maria Gomez').closest('button');
    expect(mariaBtn?.disabled).toBe(true);

    const juanBtn = screen.getByText('Juan Perez').closest('button');
    expect(juanBtn?.disabled).toBe(false);
  });

  it('allows multi-selecting users and submitting selected IDs', async () => {
    const onConfirmMock = vi.fn();
    renderModal({ onConfirm: onConfirmMock, assignedUserIds: [] });

    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeDefined();
    });

    // Toggle Juan
    const juanBtn = screen.getByText('Juan Perez').closest('button');
    fireEvent.click(juanBtn);

    expect(screen.getByText('1 usuario(s) seleccionado(s)')).toBeDefined();

    // Toggle Carlos
    const carlosBtn = screen.getByText('Carlos Lopez').closest('button');
    fireEvent.click(carlosBtn);

    expect(screen.getByText('2 usuario(s) seleccionado(s)')).toBeDefined();

    // Click confirm button
    const submitBtn = screen.getByText('Asignar 2 usuarios').closest('button');
    fireEvent.click(submitBtn);

    expect(onConfirmMock).toHaveBeenCalledWith(expect.arrayContaining([10, 30]));
  });

  it('supports selecting all visible unassigned users', async () => {
    renderModal({ assignedUserIds: [20] });

    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeDefined();
    });

    const selectVisibleBtn = screen.getByText('Seleccionar visibles');
    fireEvent.click(selectVisibleBtn);

    // Only Juan (10) and Carlos (30) should be selected, Maria (20) was already assigned
    expect(screen.getByText('2 usuario(s) seleccionado(s)')).toBeDefined();
  });
});
