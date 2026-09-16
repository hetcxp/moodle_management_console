import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RubricDetailView } from '../views/RubricDetailView';
import { ToastProvider } from '../components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSetLocation = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    useLocation: () => ['/competencies/rubrics/51', mockSetLocation],
  };
});

const { mockTemplates } = vi.hoisted(() => ({
  mockTemplates: [
    {
      id: 51,
      areaid: 51,
      name: '[MC-AREA-19] Rúbrica: Orientación al cliente',
      description: '<p>Metodología Martha Alles: Evaluación analítica</p>',
      descriptionformat: 1,
      status: 20,
      criteria_count: 2,
      max_score: 100,
      author_name: 'Admin Moodle',
      timecreated: 1718000000,
      timemodified: 1718000000,
      criteria: [
        {
          id: 195,
          sortorder: 1,
          description: '<p>Sensibilidad hacia necesidades del cliente</p>',
          levels: [
            { id: 971, score: 0, definition: '<p>Nivel 0: Sin evidencia de servicio</p>' },
            { id: 972, score: 25, definition: '<p>Grado D: En desarrollo</p>' },
            { id: 973, score: 50, definition: '<p>Grado C: Mínimo aceptable</p>' },
            { id: 974, score: 75, definition: '<p>Grado B: Muy bueno</p>' },
            { id: 975, score: 100, definition: '<p>Grado A: Superior y estratégico</p>' },
          ],
        },
        {
          id: 196,
          sortorder: 2,
          description: '<p>Resolución efectiva de reclamos</p>',
          levels: [
            { id: 981, score: 0, definition: '<p>Nivel 0: Sin resolución</p>' },
            { id: 982, score: 100, definition: '<p>Grado A: Resuelve y fideliza</p>' },
          ],
        },
      ],
    },
  ],
}));

vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getRubricTemplates: vi.fn().mockResolvedValue({
      total: 1,
      templates: mockTemplates,
    }),
    rubricTemplateAction: vi.fn().mockResolvedValue({ success: 1 }),
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

describe('RubricDetailView Component', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderComponent = (templateId = 51, onBack = vi.fn()) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RubricDetailView templateId={templateId} onBack={onBack} />
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders rubric title, metadata, KPIs, and matrix table', async () => {
    renderComponent(51);

    await waitFor(() => {
      expect(screen.getByText('[MC-AREA-19] Rúbrica: Orientación al cliente')).toBeDefined();
      expect(screen.getByText(/ID:\s*51/)).toBeDefined();
      expect(screen.getByText(/Área:\s*51/)).toBeDefined();
      expect(screen.getAllByText('100 pts').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Criterios/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Admin Moodle')).toBeDefined();
      expect(screen.getByText(/Metodología Martha Alles/)).toBeDefined();
    });

    // Check table headers and content
    expect(screen.getByText('Criterio Evaluativo')).toBeDefined();
    expect(screen.getByText('Escala de Niveles de Desempeño y Puntuación')).toBeDefined();
    expect(screen.getByText(/Sensibilidad hacia necesidades del cliente/)).toBeDefined();
    expect(screen.getByText(/Nivel 0: Sin evidencia de servicio/)).toBeDefined();
    expect(screen.getByText(/Grado A: Superior y estratégico/)).toBeDefined();
  });

  it('switches between matrix view and cards view', async () => {
    renderComponent(51);

    await waitFor(() => {
      expect(screen.getByText('Matriz')).toBeDefined();
      expect(screen.getByText('Tarjetas')).toBeDefined();
    });

    const cardsBtn = screen.getByText('Tarjetas');
    fireEvent.click(cardsBtn);

    // In cards view, optimal level badge should appear
    await waitFor(() => {
      expect(screen.getAllByText('Desempeño Óptimo').length).toBeGreaterThan(0);
    });

    // Switch back to matrix
    const matrixBtn = screen.getByText('Matriz');
    fireEvent.click(matrixBtn);

    await waitFor(() => {
      expect(screen.getByText('Escala de Niveles de Desempeño y Puntuación')).toBeDefined();
    });
  });

  it('calls onBack when clicking Volver a Rúbricas', async () => {
    const handleBack = vi.fn();
    renderComponent(51, handleBack);

    await waitFor(() => {
      expect(screen.getByText('Volver a Rúbricas')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Volver a Rúbricas'));
    expect(handleBack).toHaveBeenCalled();
  });

  it('shows not found message for non-existent rubric template', async () => {
    renderComponent(9999);

    await waitFor(() => {
      expect(screen.getByText('Plantilla de rúbrica no encontrada')).toBeDefined();
      expect(screen.getByText(/No se encontró ninguna plantilla de rúbrica con el identificador #9999/)).toBeDefined();
    });
  });

  it('opens edit modal from detail view and executes update', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent(51);

    await waitFor(() => {
      expect(screen.getByTitle('Editar plantilla de rúbrica')).toBeDefined();
    });

    fireEvent.click(screen.getByTitle('Editar plantilla de rúbrica'));

    await waitFor(() => {
      expect(screen.getByText('Editar Plantilla de Rúbrica')).toBeDefined();
    });

    const nameInput = screen.getByDisplayValue('[MC-AREA-19] Rúbrica: Orientación al cliente');
    expect(nameInput).toBeDefined();

    fireEvent.change(nameInput, { target: { value: '[MC-AREA-19] Rúbrica: Orientación al cliente - Actualizada' } });

    const saveBtn = screen.getByText('Guardar Cambios');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(AdminerApi.rubricTemplateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          templateid: 51,
          name: '[MC-AREA-19] Rúbrica: Orientación al cliente - Actualizada',
        })
      );
    });
  });

  it('opens delete confirmation modal and executes delete', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    const handleBack = vi.fn();
    renderComponent(51, handleBack);

    await waitFor(() => {
      expect(screen.getByTitle('Eliminar plantilla de rúbrica')).toBeDefined();
    });

    fireEvent.click(screen.getByTitle('Eliminar plantilla de rúbrica'));

    await waitFor(() => {
      expect(screen.getByText('¿Eliminar plantilla de rúbrica?')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Sí, eliminar plantilla'));

    await waitFor(() => {
      expect(AdminerApi.rubricTemplateAction).toHaveBeenCalledWith({
        action: 'delete',
        templateid: 51,
      });
      expect(handleBack).toHaveBeenCalled();
    });
  });
});
