import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { ToastProvider } from '../components/ui/Toast';
import { CourseCsvModal } from '../views/courses/CourseCsvModal';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ permissions: { is_siteadmin: 1 } }),
}));

vi.mock('../hooks/usePermission', () => ({
  usePermission: () => true,
  usePermissionsHelper: () => ({ has: () => true }),
}));

describe('CourseCsvModal', () => {
  it('renders modal dialog with file input', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CourseCsvModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />
        </ToastProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Importar Cursos (CSV)')).toBeDefined();
    expect(screen.getByText('Subir Archivo')).toBeDefined();
  });
});
