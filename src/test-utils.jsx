import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { HelpProvider } from './context/HelpContext';
import { LicenseUiProvider } from './context/LicenseUiContext';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Turn off retries for testing
    },
  },
});

export function renderWithProviders(ui, { authValue = {}, ...renderOptions } = {}) {
  const testQueryClient = createTestQueryClient();

  const permissions = {
    is_siteadmin: 1,
    is_licensed: 1,
    can_config_site: 1,
    ...(authValue.permissions || {}),
  };

  const defaultAuthValue = {
    isAuthenticated: true,
    user: { id: 1, username: 'testuser', fullname: 'Test User' },
    permissions,
    isLicensed: permissions.is_licensed === 1,
    licenseStatus: permissions.is_licensed === 1 ? 'active' : 'missing',
    licenseExpiresAt: 9999999999,
    licenseDaysLeft: 365,
    siteId: 'test-site-id',
    activateLicense: async () => ({ valid: true }),
    token: 'fake-token',
    login: () => {},
    logout: () => {},
    ...authValue,
  };

  const Wrapper = ({ children }) => {
    return (
      <QueryClientProvider client={testQueryClient}>
        <AuthContext.Provider value={defaultAuthValue}>
          <LicenseUiProvider>
            <ThemeProvider>
              <ToastProvider>
                <HelpProvider>
                  {children}
                </HelpProvider>
              </ToastProvider>
            </ThemeProvider>
          </LicenseUiProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  };
}
