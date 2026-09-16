import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScalesView } from '../views/ScalesView';
import { ToastProvider } from '../components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock AdminerApi
vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getScales: vi.fn().mockResolvedValue({
      scales: [
        {
          id: 1,
          name: 'Escala Estándar Moodle',
          isdefault: 1,
          items: ['No competente', 'Competente'],
          locked: 1,
          frameworks_count: 2,
        },
        {
          id: 2,
          name: 'Escala Rúbrica 1-4',
          isdefault: 0,
          items: ['Inicial', 'Básico', 'Autónomo', 'Estratégico'],
          locked: 0,
          frameworks_count: 0,
        },
      ],
    }),
    scaleAction: vi.fn().mockResolvedValue({
      success: 1,
      scaleid: 3,
      locked: 0,
      frameworks_count: 0,
    }),
  },
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    isAuthenticated: true,
    permissions: {
      is_siteadmin: 1,
      can_manage_competencies: 1,
    },
  }),
}));

describe('ScalesView', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderComponent = (props = {}) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ScalesView onBack={vi.fn()} {...props} />
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders title, KPIs, and scales list with level count badges', async () => {
    renderComponent();

    expect(screen.getByText('Escalas de Evaluación')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Escala Rúbrica 1-4')).toBeDefined();
      expect(screen.getByText(/2 marcos/i)).toBeDefined();
      expect(screen.getAllByText(/Sin marcos/i).length).toBeGreaterThanOrEqual(1);
      // Verify level count badges exist instead of raw items in table
      expect(screen.getByText('2 niveles')).toBeDefined();
      expect(screen.getByText('4 niveles')).toBeDefined();
      // Ensure level text like 'Inicial' or 'Estratégico' is NOT in the table cells
      expect(screen.queryByText('Inicial')).toBeNull();
      expect(screen.queryByText('Estratégico')).toBeNull();
    });
  });

  it('opens ScaleFormModal when clicking Nueva Escala and displays levels preview', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Nueva Escala')).toBeDefined();
    });

    const newBtn = screen.getByText('Nueva Escala');
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByText('Nueva Escala de Evaluación')).toBeDefined();
      expect(screen.getByPlaceholderText('Ej. Escala de Habilidades Digitales 2026')).toBeDefined();
      expect(screen.getByText(/Vista previa de niveles \(2\):/i)).toBeDefined();
      expect(screen.getByText('No competente')).toBeDefined();
      expect(screen.getByText('Competente')).toBeDefined();
    });
  });

  it('opens delete confirmation modal when clicking delete button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Eliminar escala Escala Rúbrica 1-4')).toBeDefined();
    });

    const deleteBtn = screen.getByLabelText('Eliminar escala Escala Rúbrica 1-4');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Confirmar Eliminación de Escala')).toBeDefined();
      expect(screen.getByText('Eliminar definitivamente')).toBeDefined();
    });
  });

  it('disables delete button for locked scale or scale with frameworks', async () => {
    renderComponent();

    await waitFor(() => {
      const lockedDeleteBtn = screen.getByLabelText('Eliminar escala Escala Estándar Moodle');
      expect(lockedDeleteBtn).toHaveProperty('disabled', true);
    });
  });
});
