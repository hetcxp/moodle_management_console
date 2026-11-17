import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/LicenseUiContext', () => ({
  useLicenseUi: () => ({ openLicenseModal: vi.fn() }),
}));

vi.mock('../context/HelpContext', () => ({
  useHelp: () => ({ isOpen: false, toggle: vi.fn() }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/dashboard', vi.fn()],
}));

vi.mock('../components/ThemeSelector', () => ({
  ThemeSelector: () => <div data-testid="theme-selector" />,
}));

describe('Header component - Navigation and Auth actions', () => {
  const originalManagementConfig = window.MANAGEMENT_CONSOLE_CONFIG;
  const originalAdminerConfig = window.ADMINER_CONFIG;
  const mockLogout = vi.fn();

  beforeEach(() => {
    mockLogout.mockClear();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        fullname: 'Usuario de Prueba',
        username: 'testuser',
      },
      logout: mockLogout,
      permissions: { is_siteadmin: 0 },
      isLicensed: true,
      licenseDaysLeft: 30,
    });
  });

  afterEach(() => {
    if (originalManagementConfig !== undefined) {
      window.MANAGEMENT_CONSOLE_CONFIG = originalManagementConfig;
    } else {
      delete window.MANAGEMENT_CONSOLE_CONFIG;
    }

    if (originalAdminerConfig !== undefined) {
      window.ADMINER_CONFIG = originalAdminerConfig;
    } else {
      delete window.ADMINER_CONFIG;
    }
  });

  it('renders "Volver a Moodle" link with explicit moodleUrl and hides "Cerrar sesión" in embedded mode', () => {
    window.MANAGEMENT_CONSOLE_CONFIG = {
      embedded: true,
      token: 'tok_test_123',
      moodleUrl: 'https://moodle.example.com',
    };
    delete window.ADMINER_CONFIG;

    render(<Header />);

    const returnLink = screen.getByRole('link', { name: /Volver a Moodle/i });
    expect(returnLink).toBeDefined();
    expect(returnLink.getAttribute('href')).toBe('https://moodle.example.com/my');
    expect(returnLink.getAttribute('title')).toBe('Volver al Área Personal de Moodle (/my)');

    expect(screen.queryByRole('button', { name: /Cerrar sesión/i })).toBeNull();
  });

  it('uses fallback href="/my" when moodleUrl is not provided in embedded mode', () => {
    window.MANAGEMENT_CONSOLE_CONFIG = {
      embedded: true,
      token: 'tok_test_456',
    };
    delete window.ADMINER_CONFIG;

    render(<Header />);

    const returnLink = screen.getByRole('link', { name: /Volver a Moodle/i });
    expect(returnLink).toBeDefined();
    expect(returnLink.getAttribute('href')).toBe('/my');
    expect(screen.queryByRole('button', { name: /Cerrar sesión/i })).toBeNull();
  });

  it('renders "Cerrar sesión" button and hides "Volver a Moodle" in standalone external mode', () => {
    delete window.MANAGEMENT_CONSOLE_CONFIG;
    delete window.ADMINER_CONFIG;

    render(<Header />);

    expect(screen.queryByRole('link', { name: /Volver a Moodle/i })).toBeNull();

    const logoutButton = screen.getByRole('button', { name: /Cerrar sesión/i });
    expect(logoutButton).toBeDefined();

    fireEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

