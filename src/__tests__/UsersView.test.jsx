import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { UsersView } from '../views/UsersView';
import { AdminerApi } from '../services/adminer-api';

// Mock the API
vi.mock('../services/adminer-api', () => import('./__mocks__/adminer-api'));


describe('UsersView', () => {
  it('renders correctly', () => {
    renderWithProviders(<UsersView />);
    
    // We expect the title to be there
    expect(screen.getByText('Directorio de Usuarios')).toBeDefined();
  });

  it('renders users list with temporary password action button', async () => {
    AdminerApi.getUsers.mockResolvedValueOnce({
      totalcount: 1,
      users: [
        {
          id: 10,
          username: 'student1',
          firstname: 'Alice',
          lastname: 'Smith',
          fullname: 'Alice Smith',
          email: 'alice@example.com',
          suspended: 0,
          is_active: 1,
          is_admin: 0,
          lastaccess: 1725148800,
          cohorts_count: 1,
          enrolled_courses: 2,
          completed_courses: 1,
          progress: 50
        }
      ]
    });

    renderWithProviders(<UsersView />);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeDefined();
    });

    expect(screen.getByTitle('Enviar link de contraseña temporal')).toBeDefined();
  });

  it('renders add user modal with email as username and create/send password checkboxes', async () => {
    AdminerApi.addUser = vi.fn().mockResolvedValue({ success: true, userid: 99 });

    const user = {
      is_siteadmin: 1,
      can_update_users: 1
    };

    renderWithProviders(<UsersView />, {
      authValue: { permissions: user }
    });

    const addBtn = screen.getByRole('button', { name: /Añadir Usuario/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Añadir Nuevo Usuario')).toBeDefined();
    });
    
    const emailCheckbox = screen.getByLabelText('Usar el email como nombre de usuario');
    const passwordCheckbox = screen.getByLabelText('Crear y enviar la contraseña al usuario por correo');
    
    expect(emailCheckbox).toBeDefined();
    expect(passwordCheckbox).toBeDefined();

    // Type into first and last name
    fireEvent.change(screen.getByPlaceholderText('Ej. Juan'), { target: { value: 'Carlos' } });
    fireEvent.change(screen.getByPlaceholderText('Ej. Pérez'), { target: { value: 'Gómez' } });
    
    // Type into email
    const emailInput = screen.getByPlaceholderText('juan.perez@ejemplo.com');
    fireEvent.change(emailInput, { target: { value: 'carlos.gomez@empresa.com' } });

    // Click use email as username checkbox
    fireEvent.click(emailCheckbox);

    const usernameInput = screen.getByPlaceholderText('juanperez');
    expect(usernameInput.value).toBe('carlos.gomez@empresa.com');
    expect(usernameInput.disabled).toBe(true);

    // Click create and send password checkbox
    fireEvent.click(passwordCheckbox);
    expect(screen.getByText(/Se generará una contraseña segura automáticamente/i)).toBeDefined();

    // Click Guardar Usuario
    const saveBtn = screen.getByRole('button', { name: /Guardar Usuario/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(AdminerApi.addUser).toHaveBeenCalledWith({
        firstname: 'Carlos',
        lastname: 'Gómez',
        email: 'carlos.gomez@empresa.com',
        username: 'carlos.gomez@empresa.com',
        password: '',
        createpassword: 1
      });
    });
  });
});

