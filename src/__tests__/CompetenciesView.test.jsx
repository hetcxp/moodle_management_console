import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompetenciesView } from '../views/CompetenciesView';
import { ToastProvider } from '../components/ui/Toast';
import { AuthProvider } from '../context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock AdminerApi
vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getCompetencyFrameworks: vi.fn().mockResolvedValue({
      totalcount: 2,
      page: 0,
      perpage: 50,
      frameworks: [
        {
          id: 1,
          shortname: 'Competencias Digitales',
          idnumber: 'DIG-2026',
          description: 'Marco de prueba',
          visible: 1,
          scaleid: 1,
          scalename: 'Escala Estándar Moodle',
          competenciescount: 3,
        },
        {
          id: 2,
          shortname: 'Competencias Blandas',
          idnumber: 'SOFT-2026',
          description: 'Habilidades blandas',
          visible: 0,
          scaleid: 1,
          scalename: 'Escala Estándar Moodle',
          competenciescount: 0,
        },
      ],
    }),
    getCompetencyKpis: vi.fn().mockResolvedValue({
      total_frameworks: 2,
      visible_frameworks: 1,
      hidden_frameworks: 1,
      total_competencies: 3,
      pending_reviews: 5,
    }),
    getScales: vi.fn().mockResolvedValue({
      scales: [
        { id: 1, name: 'Escala Estándar Moodle', isdefault: 1, items: ['No competente', 'Competente'] },
        { id: 2, name: 'Escala Avanzada 1-5', isdefault: 0, items: ['1', '2', '3', '4', '5'] },
      ],
    }),
    competencyFrameworkAction: vi.fn().mockResolvedValue({ success: true, message: 'OK', affectedcount: 1 }),
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
      can_view_competencies: 1,
    },
  }),
}));

describe('CompetenciesView', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CompetenciesView onNavigateToDetail={vi.fn()} />
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders title, KPIs and table headers', async () => {
    renderComponent();

    expect(screen.getByText('Marcos de Competencias')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('Competencias Digitales')).toBeDefined();
      expect(screen.getByText('Competencias Blandas')).toBeDefined();
      expect(screen.getByText('Visible')).toBeDefined();
      expect(screen.getByText('Oculto')).toBeDefined();
      expect(screen.getByText('Revisiones Pendientes')).toBeDefined();
      expect(screen.getByText('5')).toBeDefined();
    });
  });

  it('opens create modal with default scale preselected', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Nuevo Marco')).toBeDefined();
    });

    const createBtn = screen.getByText('Nuevo Marco');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Configura el marco y su escala de calificación predeterminada.')).toBeDefined();
      expect(screen.getByPlaceholderText('Ej. Marco de Habilidades Digitales 2026')).toBeDefined();
    });
  });

  it('triggers toggle visibility action when clicking action button', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTitle('Ocultar marco')).toBeDefined();
    });

    const toggleBtn = screen.getByTitle('Ocultar marco');
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(AdminerApi.competencyFrameworkAction).toHaveBeenCalledWith({
        action: 'toggle_visibility',
        frameworkid: 1,
      });
    });
  });
});
