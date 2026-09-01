import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompetencyDetailView } from '../views/CompetencyDetailView';
import { ToastProvider } from '../components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock AdminerApi
vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getCompetencyDetail: vi.fn().mockResolvedValue({
      id: 101,
      shortname: 'Competencia en Análisis de Datos',
      idnumber: 'DAT-01',
      description: 'Capacidad para estructurar y modelar datos.',
      parentid: 0,
      path: '/0/101/',
      sortorder: 1,
      competencyframeworkid: 1,
      frameworkname: 'Marco de Habilidades 2026',
      frameworkidnumber: 'HAB-2026',
      frameworkvisible: 1,
      scaleid: 1,
      scalename: 'Escala Estándar',
      timecreated: 1725148800,
      timemodified: 1725148800,
    }),
    getCompetencyCourses: vi.fn().mockResolvedValue({
      courses: [
        {
          id: 10,
          fullname: 'Curso de Big Data',
          shortname: 'BD-101',
          idnumber: 'DATA-BD',
          visible: 1,
          category: 1,
          categoryname: 'Tecnología',
          ruleoutcome: 3, // Completar competencia
          sortorder: 1,
          timecreated: 1725148800,
          activities: [
            {
              id: 501,
              cmid: 1001,
              modname: 'quiz',
              name: 'Examen Final Big Data',
              ruleoutcome: 3,
              sortorder: 1,
              timecreated: 1725148800,
            },
            {
              id: 502,
              cmid: 1002,
              modname: 'assign',
              name: 'Proyecto Práctico Hadoop',
              ruleoutcome: 1,
              sortorder: 2,
              timecreated: 1725148800,
            }
          ]
        },
        {
          id: 20,
          fullname: 'Machine Learning Básico',
          shortname: 'ML-101',
          idnumber: 'DATA-ML',
          visible: 1,
          category: 1,
          categoryname: 'Tecnología',
          ruleoutcome: 1, // Adjuntar evidencia
          sortorder: 2,
          timecreated: 1725148800,
          activities: []
        },
      ],
    }),
    competencyCourseAction: vi.fn().mockResolvedValue({
      success: true,
      message: 'Operación de curso completada',
      affectedcount: 1,
    }),
    getCourseAvailableActivities: vi.fn().mockResolvedValue({
      activities: [
        {
          cmid: 1003,
          courseid: 10,
          modname: 'quiz',
          name: 'Quiz Parcial 1',
          visible: 1,
          section: 1,
          islinked: 0,
          linkid: 0,
          ruleoutcome: 0,
        }
      ]
    }),
    moduleCompetencyAction: vi.fn().mockResolvedValue({
      success: true,
      message: 'Operación de actividad completada',
      affectedcount: 1,
    }),
    getCourses: vi.fn().mockResolvedValue({
      courses: [
        { id: 30, fullname: 'Deep Learning Avanzado', shortname: 'DL-201', categoryname: 'IA' },
      ],
      totalcount: 1,
    }),
    getCompetencyReviews: vi.fn().mockResolvedValue({
      totalcount: 1,
      reviews: [
        {
          usercompid: 99,
          userid: 5,
          userfullname: 'Estudiante Ejemplo',
          useremail: 'estudiante@test.com',
          competencyid: 101,
          competencyname: 'Competencia en Análisis de Datos',
          competencyidnumber: 'DAT-01',
          frameworkid: 1,
          frameworkname: 'Marco de Habilidades 2026',
          status: 1,
          proficiency: 0,
          currentgrade: 1,
          scalename: 'Escala Estándar',
          scaleoptions: [{ name: 'No competente', value: 1 }, { name: 'Competente', value: 2 }],
          timemodified: 1725148800,
        },
      ],
    }),
  },
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    permissions: {
      is_siteadmin: 1,
      can_manage_competencies: 1,
    },
  }),
}));

describe('CompetencyDetailView', () => {
  let queryClient;
  const mockBack = vi.fn();
  const mockNavigateToDetail = vi.fn();

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
          <CompetencyDetailView
            frameworkId="1"
            competencyId="101"
            onBack={mockBack}
            onNavigateToDetail={mockNavigateToDetail}
          />
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders competency metadata, KPIs and linked courses with activities count', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Competencia en Análisis de Datos/i })).toBeDefined();
      expect(screen.getByText('DAT-01')).toBeDefined();
      expect(screen.getByText('Curso de Big Data')).toBeDefined();
      expect(screen.getByText('Machine Learning Básico')).toBeDefined();
      expect(screen.getByText(/2 actividad\(es\) clave vinculada\(s\)/i)).toBeDefined();
      expect(screen.getByText('Examen Final Big Data')).toBeDefined();
      expect(screen.getByText('Proyecto Práctico Hadoop')).toBeDefined();
    });
  });

  it('opens competency pending reviews modal when clicking header button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Curso de Big Data')).toBeDefined();
    });

    const reviewsBtn = screen.getByTitle('Ver revisiones pendientes');
    fireEvent.click(reviewsBtn);

    await waitFor(() => {
      expect(screen.getByText('Estudiante Ejemplo')).toBeDefined();
      expect(screen.getByText(/estudiante@test.com/i)).toBeDefined();
    });
  });

  it('updates course completion rule inline', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Curso de Big Data')).toBeDefined();
    });

    const selects = screen.getAllByRole('combobox');
    // selects[0] is filter rule, selects[1] is course 10 rule
    const courseRuleSelect = selects[1];
    fireEvent.change(courseRuleSelect, { target: { value: '2' } });

    await waitFor(() => {
      expect(AdminerApi.competencyCourseAction).toHaveBeenCalledWith({
        action: 'update_rule',
        competencyid: 101,
        courseids: [10],
        ruleoutcome: 2,
      });
    });
  });

  it('updates activity completion rule inline', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Examen Final Big Data')).toBeDefined();
    });

    const selects = screen.getAllByRole('combobox');
    // selects[0]: filter, selects[1]: course 10, selects[2]: activity 1001, selects[3]: activity 1002, selects[4]: course 20
    const activitySelect = selects[2];
    fireEvent.change(activitySelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(AdminerApi.moduleCompetencyAction).toHaveBeenCalledWith({
        action: 'update_rule',
        competencyid: 101,
        cmid: 1001,
        ruleoutcome: 1,
      });
    });
  });

  it('unlinks course when confirming modal', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Machine Learning Básico')).toBeDefined();
    });

    const unlinkButtons = screen.getAllByTitle('Desvincular curso');
    fireEvent.click(unlinkButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Confirmar Desvinculación de Curso')).toBeDefined();
    });

    const confirmBtns = screen.getAllByRole('button', { name: /Desvincular Curso/i });
    // The button inside dialog is the last one
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(AdminerApi.competencyCourseAction).toHaveBeenCalledWith({
        action: 'remove',
        competencyid: 101,
        courseids: [20],
      });
    });
  });
});

