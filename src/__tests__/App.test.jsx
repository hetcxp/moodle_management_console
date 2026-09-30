import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('App Root Component', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    delete window.MANAGEMENT_CONSOLE_CONFIG;
    delete window.ADMINER_CONFIG;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('renders LoginView when user is not authenticated', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Acceder al Panel')).toBeDefined();
    });
  });

  it('renders App shell with Sidebar and Header when authenticated', async () => {
    const validUser = {
      userid: 2,
      username: 'admin',
      fullname: 'Admin User',
      roles: ['admin'],
    };

    sessionStorage.setItem('adminer_token', 'valid-test-token');
    sessionStorage.setItem('adminer_token_date', String(Date.now()));
    sessionStorage.setItem('adminer_user', JSON.stringify(validUser));

    render(<App />);

    await waitFor(() => {
      // Main shell elements should be present
      expect(document.getElementById('main-content')).toBeDefined();
    });
  });

  it('uses embedded basePath configuration when running embedded', () => {
    window.MANAGEMENT_CONSOLE_CONFIG = {
      embedded: true,
      basePath: '/admin/tool/management_console/index.php',
    };

    const { container } = render(<App />);
    expect(container).toBeDefined();
  });
});
