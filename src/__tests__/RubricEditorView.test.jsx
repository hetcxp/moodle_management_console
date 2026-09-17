import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RubricEditorView } from '../views/RubricEditorView';
import { ToastProvider } from '../components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSetLocation = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    useLocation: () => ['/competencies/rubrics/new', mockSetLocation],
    useRoute: () => [false, {}],
  };
});

const { mockTemplates } = vi.hoisted(() => ({
  mockTemplates: [
    {
      id: 51,
      name: 'Rúbrica de Investigación y Redacción',
      description: '<p>Evalúa rigor metodológico y redacción académica.</p>',
      criteria: [
        {
          id: 101,
          sortorder: 1,
          description: 'Metodología científica',
          levels: [
            { id: 201, score: 0, definition: 'Sin metodología definida' },
            { id: 202, score: 15, definition: 'Metodología rigurosa y reproducible' },
          ],
        },
        {
          id: 102,
          sortorder: 2,
          description: 'Claridad en la redacción',
          levels: [
            { id: 203, score: 0, definition: 'Confuso' },
            { id: 204, score: 10, definition: 'Excelente claridad' },
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
    rubricTemplateAction: vi.fn().mockResolvedValue({ success: 1, templateid: 51 }),
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

const mockToggleHelp = vi.fn();
vi.mock('../context/HelpContext', () => ({
  useHelp: () => ({
    helpData: {
      kpisHelp: {
        'Puntaje Máximo': 'Puntuación máxima acumulada sumando el valor más alto de cada criterio.',
        'Criterios': 'Número total de dimensiones evaluativas.',
      },
    },
    toggle: mockToggleHelp,
  }),
}));

describe('RubricEditorView Component', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
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
          <RubricEditorView {...props} />
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders in create mode with default single criterion, 3 levels, and initial max score', async () => {
    renderComponent();

    expect(screen.getByText('Nueva Plantilla de Rúbrica')).toBeDefined();
    expect(screen.getByPlaceholderText(/Rúbrica de Proyecto Final/i)).toBeDefined();

    // Default criterion #1
    expect(screen.getByText('Criterio #1')).toBeDefined();
    // Default 3 levels with initial points 0, 5, 10
    expect(screen.getByDisplayValue('No evidencia el desempeño mínimo esperado.')).toBeDefined();
    expect(screen.getByDisplayValue('Demuestra dominio en desarrollo pero requiere acompañamiento.')).toBeDefined();
    expect(screen.getByDisplayValue('Alcanza satisfactoriamente el estándar de competencia requerido.')).toBeDefined();

    // Default max score KPI is 10 pts
    expect(screen.getAllByText('10 pts').length).toBeGreaterThanOrEqual(1);
  });

  it('allows adding and removing criteria and updates totals dynamically', async () => {
    renderComponent();

    const addBtn = screen.getByRole('button', { name: /Añadir Criterio/i });
    fireEvent.click(addBtn);

    // Now 2 criteria
    expect(screen.getByText('Criterio #2')).toBeDefined();
    // Total max score is now 20 pts (10 + 10)
    expect(screen.getAllByText('20 pts').length).toBeGreaterThanOrEqual(1);

    // Remove second criterion
    const deleteBtns = screen.getAllByLabelText('Eliminar este criterio');
    expect(deleteBtns.length).toBe(2);
    fireEvent.click(deleteBtns[1]);

    expect(screen.queryByText('Criterio #2')).toBeNull();
    expect(screen.getAllByText('10 pts').length).toBeGreaterThanOrEqual(1);
  });

  it('allows duplicating a criterion', async () => {
    renderComponent();

    const duplicateBtn = screen.getByLabelText('Duplicar este criterio');
    fireEvent.click(duplicateBtn);

    expect(screen.getByText('Criterio #2')).toBeDefined();
    expect(screen.getAllByText('20 pts').length).toBeGreaterThanOrEqual(1);
  });

  it('allows adding a level to a criterion and recalculating max score', async () => {
    renderComponent();

    const addLevelBtn = screen.getByLabelText('Añadir nivel al criterio 1');
    fireEvent.click(addLevelBtn);

    // Change score of the newly added level (default 15)
    const scoreInputs = screen.getAllByLabelText(/Puntos para nivel/i);
    expect(scoreInputs.length).toBe(4);

    fireEvent.change(scoreInputs[3], { target: { value: '25' } });

    // Now max score for criterion 1 is 25 pts
    expect(screen.getAllByText('25 pts').length).toBeGreaterThanOrEqual(1);
  });

  it('validates required rubric name before saving', async () => {
    renderComponent();

    const saveBtn = screen.getAllByRole('button', { name: /Crear Plantilla/i })[0];
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('El nombre de la plantilla de rúbrica es obligatorio.')).toBeDefined();
    });
  });

  it('submits a new rubric successfully to AdminerApi.rubricTemplateAction', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent();

    const nameInput = screen.getByPlaceholderText(/Rúbrica de Proyecto Final/i);
    fireEvent.change(nameInput, { target: { value: 'Rúbrica de Competencias Digitales' } });

    const descInput = screen.getByPlaceholderText(/Detalla las instrucciones de aplicación/i);
    fireEvent.change(descInput, { target: { value: 'Evaluación formativa de herramientas TIC.' } });

    const saveBtn = screen.getAllByRole('button', { name: /Crear Plantilla/i })[0];
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(AdminerApi.rubricTemplateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          name: 'Rúbrica de Competencias Digitales',
          description: 'Evaluación formativa de herramientas TIC.',
          criteria: expect.arrayContaining([
            expect.objectContaining({
              sortorder: 1,
              levels: expect.any(Array),
            }),
          ]),
        })
      );
    });

    expect(mockSetLocation).toHaveBeenCalledWith('/competencies/rubrics');
  });

  it('loads existing rubric in edit mode and submits update', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent({ templateId: 51 });

    await waitFor(() => {
      expect(screen.getByText('Editar Plantilla de Rúbrica')).toBeDefined();
      expect(screen.getByDisplayValue('Rúbrica de Investigación y Redacción')).toBeDefined();
      expect(screen.getByDisplayValue('Metodología científica')).toBeDefined();
      expect(screen.getByDisplayValue('Claridad en la redacción')).toBeDefined();
      // Total max score is 15 + 10 = 25 pts
      expect(screen.getAllByText('25 pts').length).toBeGreaterThanOrEqual(1);
    });

    // Update name
    const nameInput = screen.getByDisplayValue('Rúbrica de Investigación y Redacción');
    fireEvent.change(nameInput, { target: { value: 'Rúbrica de Investigación y Redacción - Actualizada' } });

    const saveBtn = screen.getAllByRole('button', { name: /Guardar Cambios/i })[0];
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(AdminerApi.rubricTemplateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          templateid: 51,
          name: 'Rúbrica de Investigación y Redacción - Actualizada',
        })
      );
    });

    expect(mockSetLocation).toHaveBeenCalledWith('/competencies/rubrics/51');
  });

  it('renders not found state when templateId does not exist', async () => {
    renderComponent({ templateId: 9999 });

    await waitFor(() => {
      expect(screen.getByText('Plantilla no encontrada')).toBeDefined();
      expect(screen.getByText(/No se encontró la plantilla de rúbrica #9999/i)).toBeDefined();
    });
  });

  it('navigates back when clicking Cancelar or Volver', async () => {
    const onBack = vi.fn();
    renderComponent({ onBack });

    const cancelBtn = screen.getAllByRole('button', { name: /Cancelar/i })[0];
    fireEvent.click(cancelBtn);

    expect(onBack).toHaveBeenCalled();
  });

  it('renders pedagogical helper guidance and triggers help drawer on button click', async () => {
    renderComponent();

    // Guidance banner exists
    expect(screen.getByText('Orientaciones para el Diseño de Rúbricas')).toBeDefined();
    expect(screen.getByText(/Una rúbrica analítica efectiva desglosa una competencia/i)).toBeDefined();

    // Help banner link triggers toggle
    const bannerLink = screen.getByText('Ver guía completa (?)');
    fireEvent.click(bannerLink);
    expect(mockToggleHelp).toHaveBeenCalled();

    // Header help button triggers toggle
    const headerHelpBtn = screen.getByLabelText('Abrir panel de ayuda contextual');
    fireEvent.click(headerHelpBtn);
    expect(mockToggleHelp).toHaveBeenCalledTimes(2);
  });
});
