import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { ToastProvider } from '../components/ui/Toast';
import { UserCsvModal } from '../views/users/UserCsvModal';

describe('UserCsvModal', () => {
  it('renders modal dialog with upload instructions', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <UserCsvModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />
        </ToastProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Cargar Usuarios desde CSV')).toBeDefined();
    expect(screen.getByText('Cargar Archivo')).toBeDefined();
  });
});
