import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Turn off retries for testing
    },
  },
});

export function renderWithProviders(ui, { authValue = {}, ...renderOptions } = {}) {
  const testQueryClient = createTestQueryClient();

  const defaultAuthValue = {
    isAuthenticated: true,
    user: { id: 1, username: 'testuser', fullname: 'Test User' },
    permissions: { is_siteadmin: 1 },
    token: 'fake-token',
    login: () => {},
    logout: () => {},
    ...authValue,
  };

  const Wrapper = ({ children }) => {
    return (
      <QueryClientProvider client={testQueryClient}>
        <AuthContext.Provider value={defaultAuthValue}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  };
}
