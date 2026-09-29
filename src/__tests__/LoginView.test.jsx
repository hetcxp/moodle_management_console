import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginView } from '../views/LoginView.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';

describe('LoginView (TD-TEST-002)', () => {
  const mockLogin = vi.fn();
  const mockLoginWithToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      login: mockLogin,
      loginWithToken: mockLoginWithToken,
    });
  });

  it('renders login credentials form by default', () => {
    const { container } = render(<LoginView />);
    expect(container.querySelector('#login-username')).not.toBeNull();
    expect(container.querySelector('#login-password')).not.toBeNull();
    expect(screen.getByRole('button', { name: /acceder al panel/i })).not.toBeNull();
  });

  it('displays validation error if submitting empty credentials', async () => {
    const { container } = render(<LoginView />);
    const form = container.querySelector('#panel-credentials');
    fireEvent.submit(form);

    expect(await screen.findByText(/el usuario y la contraseña son obligatorios/i)).not.toBeNull();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('submits credentials successfully', async () => {
    mockLogin.mockResolvedValueOnce(true);
    const { container } = render(<LoginView />);

    const userInput = container.querySelector('#login-username');
    const passInput = container.querySelector('#login-password');

    fireEvent.change(userInput, { target: { value: 'admin' } });
    fireEvent.change(passInput, { target: { value: 'password123' } });

    const form = container.querySelector('#panel-credentials');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'password123');
    });
  });

  it('displays user-friendly error on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciales inválidas'));
    const { container } = render(<LoginView />);

    const userInput = container.querySelector('#login-username');
    const passInput = container.querySelector('#login-password');

    fireEvent.change(userInput, { target: { value: 'admin' } });
    fireEvent.change(passInput, { target: { value: 'wrongpass' } });

    const form = container.querySelector('#panel-credentials');
    fireEvent.submit(form);

    expect(await screen.findByText(/usuario o contraseña incorrectos/i)).not.toBeNull();
  });

  it('allows switching to token mode and submitting a manual token', async () => {
    mockLoginWithToken.mockResolvedValueOnce(true);
    const { container } = render(<LoginView />);

    const tokenTab = screen.getByRole('tab', { name: /token de administrador/i });
    fireEvent.click(tokenTab);

    const tokenInput = container.querySelector('#login-token');
    expect(tokenInput).not.toBeNull();

    fireEvent.change(tokenInput, { target: { value: 'test-token-xyz' } });
    const tokenForm = container.querySelector('#panel-token');
    fireEvent.submit(tokenForm);

    await waitFor(() => {
      expect(mockLoginWithToken).toHaveBeenCalledWith('test-token-xyz');
    });
  });
});
