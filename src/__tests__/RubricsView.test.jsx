import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RubricsView } from '../views/RubricsView';
import { ToastProvider } from '../components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSetLocation = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    useLocation: () => ['/competencies/rubrics', mockSetLocation],
  };
});

vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getRubricTemplates: vi.fn().mockResolvedValue({
      total: 2,
      templates: [
        {
          id: 51,
          areaid: 51,
          name: '[MC-AREA-19] Rúbrica: Orientación al cliente',
          description: '<p>Metodología Martha Alles</p>',
          descriptionformat: 1,
          status: 20,
          criteria_count: 4,
          max_score: 100,
          author_name: 'Admin Moodle',
          timecreated: 1718000000,
          timemodified: 1718000000,
          criteria: [
            {
              id: 195,
              sortorder: 1,
              description: '<p>Sensibilidad hacia necesidades</p>',
              levels: [
                { id: 971, score: 0, definition: 'Sin evidencia' },
                { id: 975, score: 25, definition: 'Grado A Superior' },
              ],
            },
          ],
        },
        {
          id: 52,
          areaid: 52,
          name: '[MC-AREA-20] Rúbrica: Pensamiento analítico',
          description: '<p>Capacidad de análisis</p>',
          descriptionformat: 1,
          status: 20,
          criteria_count: 3,
          max_score: 75,
          author_name: 'Admin Moodle',
          timecreated: 1718000000,
          timemodified: 1718000000,
          criteria: [],
        },
      ],
    }),
    rubricTemplateAction: vi.fn().mockResolvedValue({ success: 1, templateid: 99 }),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    permissions: {
      is_siteadmin: 1,
      can_manage_competencies: 1,
    },
  }),
}));

vi.mock('../context/HelpContext', () => ({
  useHelp: () => ({
    helpData: {
      kpisHelp: {},
    },
  }),
}));

describe('RubricsView Component', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RubricsView onBack={() => mockSetLocation('/competencies')} />
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders RubricsHeader, KPIs, and table of rubric templates', async () => {
    renderComponent();

    expect(screen.getByText('Plantillas de Rúbricas')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('[MC-AREA-19] Rúbrica: Orientación al cliente')).toBeDefined();
      expect(screen.getByText('[MC-AREA-20] Rúbrica: Pensamiento analítico')).toBeDefined();
      expect(screen.getByText('100 pts')).toBeDefined();
      expect(screen.getByText('4 criterios')).toBeDefined();
    });
  });

  it('navigates to /competencies/rubrics/:id when clicking Ver Matriz', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByLabelText(/Ver matriz de/i)[0]).toBeDefined();
    });

    fireEvent.click(screen.getAllByLabelText(/Ver matriz de/i)[0]);

    expect(mockSetLocation).toHaveBeenCalledWith('/competencies/rubrics/51');
  });

  it('opens RubricFormModal when clicking Nueva Rúbrica', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Nueva Rúbrica')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Nueva Rúbrica'));

    await waitFor(() => {
      expect(screen.getByText('Nueva Plantilla de Rúbrica')).toBeDefined();
      expect(screen.getByPlaceholderText('Ej. Rúbrica Analítica: Resolución de Problemas Complejos')).toBeDefined();
    });
  });

  it('submits a new rubric and triggers rubricTemplateAction', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Nueva Rúbrica')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Nueva Rúbrica'));

    const nameInput = screen.getByPlaceholderText('Ej. Rúbrica Analítica: Resolución de Problemas Complejos');
    fireEvent.change(nameInput, { target: { value: 'Rúbrica Test Vitest' } });

    const createBtn = screen.getByText('Crear Plantilla');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(AdminerApi.rubricTemplateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          name: 'Rúbrica Test Vitest',
        })
      );
    });
  });

  it('opens edit modal with pre-filled data and triggers update', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Editar [MC-AREA-19] Rúbrica: Orientación al cliente')).toBeDefined();
    });

    const editBtn = screen.getByLabelText('Editar [MC-AREA-19] Rúbrica: Orientación al cliente');
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText('Editar Plantilla de Rúbrica')).toBeDefined();
    });

    const nameInput = screen.getByDisplayValue('[MC-AREA-19] Rúbrica: Orientación al cliente');
    expect(nameInput).toBeDefined();

    fireEvent.change(nameInput, { target: { value: '[MC-AREA-19] Rúbrica: Orientación al cliente - Editada' } });

    const saveBtn = screen.getByText('Guardar Cambios');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(AdminerApi.rubricTemplateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          templateid: 51,
          name: '[MC-AREA-19] Rúbrica: Orientación al cliente - Editada',
        })
      );
    });
  });

  it('opens delete confirmation and triggers deletion', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Eliminar [MC-AREA-19] Rúbrica: Orientación al cliente')).toBeDefined();
    });

    const deleteBtn = screen.getByLabelText('Eliminar [MC-AREA-19] Rúbrica: Orientación al cliente');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('¿Eliminar plantilla de rúbrica?')).toBeDefined();
    });

    const confirmBtn = screen.getByText('Sí, eliminar plantilla');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(AdminerApi.rubricTemplateAction).toHaveBeenCalledWith({
        action: 'delete',
        templateid: 51,
      });
    });
  });

  it('navigates back to /competencies when clicking Volver a Competencias', async () => {
    renderComponent();

    const backBtn = screen.getByText('Volver a Competencias');
    fireEvent.click(backBtn);

    expect(mockSetLocation).toHaveBeenCalledWith('/competencies');
  });
});
