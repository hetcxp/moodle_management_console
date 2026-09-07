import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AuthService } from '../services/auth.js';
import { AdminerApi } from '../services/adminer-api.js';

// Test consumer to display context values and provide buttons
const TestConsumer = () => {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="loading">{auth.loading ? 'loading' : 'idle'}</div>
      <div data-testid="auth-status">{auth.isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="username">{auth.user?.username || 'no-user'}</div>
      <div data-testid="token">{auth.token || 'no-token'}</div>
      <div data-testid="is-siteadmin">{auth.permissions?.is_siteadmin ?? 'null'}</div>
      <div data-testid="permissions-error">{auth.permissionsError ? 'error' : 'ok'}</div>

      <button onClick={() => auth.login('testuser', 'password123')}>Login Btn</button>
      <button onClick={() => auth.loginWithToken('token-abc')}>Login Token Btn</button>
      <button onClick={() => auth.logout()}>Logout Btn</button>
      <button onClick={() => auth.reloadPermissions()}>Reload Perms Btn</button>
    </div>
  );
};

describe('AuthContext and AuthProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws an error if useAuth is used outside AuthProvider', () => {
    // Suppress React boundary console.error for this expected throw
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  it('initializes with unauthenticated state when no stored credentials', async () => {
    vi.spyOn(AuthService, 'getUser').mockReturnValue(null);
    vi.spyOn(AuthService, 'getToken').mockReturnValue(null);
    vi.spyOn(AuthService, 'isEmbedded').mockReturnValue(false);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('idle');
    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('username').textContent).toBe('no-user');
    expect(screen.getByTestId('token').textContent).toBe('no-token');
  });

  it('loads permissions and sets authenticated state when credentials exist on mount', async () => {
    vi.spyOn(AuthService, 'getUser').mockReturnValue({ username: 'hector', userid: 1 });
    vi.spyOn(AuthService, 'getToken').mockReturnValue('valid-token-123');
    vi.spyOn(AuthService, 'isEmbedded').mockReturnValue(false);
    vi.spyOn(AdminerApi, 'getPermissions').mockResolvedValue({
      is_siteadmin: 1,
      can_config_site: 1,
      can_view_courses: 1,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('idle');
      expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
      expect(screen.getByTestId('username').textContent).toBe('hector');
      expect(screen.getByTestId('token').textContent).toBe('valid-token-123');
      expect(screen.getByTestId('is-siteadmin').textContent).toBe('1');
    });
  });

  it('handles login flow and updates context', async () => {
    vi.spyOn(AuthService, 'getUser').mockReturnValue(null);
    vi.spyOn(AuthService, 'getToken').mockReturnValue(null);
    vi.spyOn(AuthService, 'isEmbedded').mockReturnValue(false);

    const loginSpy = vi.spyOn(AuthService, 'login').mockImplementation(async () => {
      vi.spyOn(AuthService, 'getUser').mockReturnValue({ username: 'logged.user', userid: 5 });
      vi.spyOn(AuthService, 'getToken').mockReturnValue('new-token-456');
      return true;
    });

    vi.spyOn(AdminerApi, 'getPermissions').mockResolvedValue({ is_siteadmin: 0 });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');

    await act(async () => {
      fireEvent.click(screen.getByText('Login Btn'));
    });

    expect(loginSpy).toHaveBeenCalledWith('testuser', 'password123', true);
    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('username').textContent).toBe('logged.user');
    expect(screen.getByTestId('token').textContent).toBe('new-token-456');
  });

  it('handles loginWithToken flow', async () => {
    vi.spyOn(AuthService, 'getUser').mockReturnValue(null);
    vi.spyOn(AuthService, 'getToken').mockReturnValue(null);
    vi.spyOn(AuthService, 'isEmbedded').mockReturnValue(false);

    vi.spyOn(AuthService, 'validateToken').mockResolvedValue({ username: 'token.user', userid: 8 });
    vi.spyOn(AdminerApi, 'getPermissions').mockResolvedValue({ is_siteadmin: 1 });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Login Token Btn'));
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('username').textContent).toBe('token.user');
    expect(screen.getByTestId('token').textContent).toBe('token-abc');
  });

  it('clears state on logout', async () => {
    vi.spyOn(AuthService, 'getUser').mockReturnValue({ username: 'testuser' });
    vi.spyOn(AuthService, 'getToken').mockReturnValue('token-xyz');
    vi.spyOn(AuthService, 'isEmbedded').mockReturnValue(false);
    vi.spyOn(AdminerApi, 'getPermissions').mockResolvedValue({ is_siteadmin: 1 });
    const logoutSpy = vi.spyOn(AuthService, 'logout').mockImplementation(() => {});

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Logout Btn'));
    });

    expect(logoutSpy).toHaveBeenCalled();
    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('username').textContent).toBe('no-user');
    expect(screen.getByTestId('token').textContent).toBe('no-token');
  });

  it('logs out automatically on moodle-auth-error custom event', async () => {
    vi.spyOn(AuthService, 'getUser').mockReturnValue({ username: 'testuser' });
    vi.spyOn(AuthService, 'getToken').mockReturnValue('token-xyz');
    vi.spyOn(AuthService, 'isEmbedded').mockReturnValue(false);
    vi.spyOn(AdminerApi, 'getPermissions').mockResolvedValue({ is_siteadmin: 1 });
    const logoutSpy = vi.spyOn(AuthService, 'logout').mockImplementation(() => {});

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('moodle-auth-error', { detail: 'Session expired' }));
    });

    expect(logoutSpy).toHaveBeenCalled();
    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
  });

  it('sets fallback permissions when getPermissions fails permanently', async () => {
    vi.useFakeTimers();
    vi.spyOn(AuthService, 'getUser').mockReturnValue({ username: 'testuser' });
    vi.spyOn(AuthService, 'getToken').mockReturnValue('token-xyz');
    vi.spyOn(AuthService, 'isEmbedded').mockReturnValue(false);
    
    // Fails initial attempt and retry attempt
    vi.spyOn(AdminerApi, 'getPermissions').mockRejectedValue(new Error('Network failure'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Fast-forward retry timer (3s)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    expect(screen.getByTestId('permissions-error').textContent).toBe('error');
    expect(screen.getByTestId('is-siteadmin').textContent).toBe('0');

    vi.useRealTimers();
  });
});
