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
      ruletype: 'core_competency\\competency_rule_all_children',
      ruleoutcome: 2,
      childrencount: 2,
      timecreated: 1725148800,
      timemodified: 1725148800,
      children: [
        {
          id: 201,
          shortname: 'Subcompetencia Limpieza de Datos',
          idnumber: 'DAT-01-A',
          description: 'Manejo de valores nulos y outliers',
          parentid: 101,
          path: '/0/101/201/',
          sortorder: 1,
          coursescount: 1,
          childrencount: 0,
          ruletype: '',
          ruleoutcome: 1,
          pendingreviewscount: 0,
          timecreated: 1725148800,
          timemodified: 1725148800,
        },
        {
          id: 202,
          shortname: 'Subcompetencia Modelado SQL',
          idnumber: 'DAT-01-B',
          description: 'Consultas avanzadas y optimización',
          parentid: 101,
          path: '/0/101/202/',
          sortorder: 2,
          coursescount: 2,
          childrencount: 0,
          ruletype: '',
          ruleoutcome: 1,
          pendingreviewscount: 0,
          timecreated: 1725148800,
          timemodified: 1725148800,
        }
      ]
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
      subcompetencycourses: [
        {
          competencyid: 201,
          competencyname: 'Subcompetencia Limpieza de Datos',
          competencyidnumber: 'DAT-01-A',
          courses: [
            {
              id: 40,
              fullname: 'Curso de Python para Data Science',
              shortname: 'PY-DATA',
              idnumber: 'PY-100',
              visible: 1,
              category: 1,
              categoryname: 'Tecnología',
              ruleoutcome: 3,
              sortorder: 1,
              timecreated: 1725148800,
              activities: [
                {
                  id: 601,
                  cmid: 1101,
                  modname: 'quiz',
                  name: 'Quiz Limpieza Pandas',
                  ruleoutcome: 3,
                  sortorder: 1,
                  timecreated: 1725148800,
                }
              ]
            }
          ]
        }
      ]
    }),
    competencyAction: vi.fn().mockResolvedValue({
      success: true,
      message: 'Operación de competencia completada',
      affectedcount: 1,
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

  it('renders competency metadata, subcompetencies tab and children list', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Competencia en Análisis de Datos/i })).toBeDefined();
      expect(screen.getByText('DAT-01')).toBeDefined();
      expect(screen.getByText('Subcompetencia Limpieza de Datos')).toBeDefined();
      expect(screen.getByText('Subcompetencia Modelado SQL')).toBeDefined();
      expect(screen.getByText('DAT-01-A')).toBeDefined();
      expect(screen.getByText('DAT-01-B')).toBeDefined();
    });
  });

  it('navigates between Subcompetencias, Regla de Completado and Cursos tabs', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Subcompetencia Limpieza de Datos')).toBeDefined();
    });

    // Switch to Regla de Completado tab
    const ruleTabBtn = screen.getByRole('button', { name: /Regla de Completado/i });
    fireEvent.click(ruleTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Regla de Completado por Subcompetencias')).toBeDefined();
      expect(screen.getByText(/competency_rule_all_children/i)).toBeDefined();
    });

    // Switch to Cursos y Actividades tab
    const coursesTabBtn = screen.getByRole('button', { name: /Cursos y Actividades/i });
    fireEvent.click(coursesTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Curso de Big Data')).toBeDefined();
      expect(screen.getByText('Machine Learning Básico')).toBeDefined();
    });
  });

  it('saves updated completion rule in Regla de Completado tab', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent();

    const ruleTabBtn = await screen.findByRole('button', { name: /Regla de Completado/i });
    fireEvent.click(ruleTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Regla de Completado por Subcompetencias')).toBeDefined();
    });

    // Click "Sin regla" option
    const noRuleBtn = screen.getByText('Sin regla', { selector: 'span' }).closest('button');
    fireEvent.click(noRuleBtn);

    // Click "Guardar Regla" button
    const saveRuleBtn = screen.getByRole('button', { name: /Guardar Regla/i });
    fireEvent.click(saveRuleBtn);

    await waitFor(() => {
      expect(AdminerApi.competencyAction).toHaveBeenCalledWith({
        action: 'update_rule',
        competencyid: 101,
        ruletype: '',
        ruleoutcome: 1,
        ruleconfig: '',
      });
    });
  });

  it('opens competency pending reviews modal when clicking header button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Competencia en Análisis de Datos/i })).toBeDefined();
    });

    const reviewsBtn = screen.getByTitle('Ver revisiones pendientes');
    fireEvent.click(reviewsBtn);

    await waitFor(() => {
      expect(screen.getByText('Estudiante Ejemplo')).toBeDefined();
      expect(screen.getByText(/estudiante@test.com/i)).toBeDefined();
    });
  });

  it('updates course completion rule in Cursos tab', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent();

    const coursesTabBtn = await screen.findByRole('button', { name: /Cursos y Actividades/i });
    fireEvent.click(coursesTabBtn);

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

  it('opens subcompetency creation modal and creates subcompetency successfully', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Subcompetencia Limpieza de Datos')).toBeDefined();
    });

    const newSubcompBtns = screen.getAllByRole('button', { name: /Nueva Subcompetencia/i });
    // Click the first "Nueva Subcompetencia" button
    fireEvent.click(newSubcompBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nueva Subcompetencia' })).toBeDefined();
    });

    // Fill form
    const nameInput = screen.getByPlaceholderText('Ej. Dominio de funciones asíncronas');
    fireEvent.change(nameInput, { target: { value: 'Subcompetencia Normalización SQL' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Crear Subcompetencia' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(AdminerApi.competencyAction).toHaveBeenCalledWith({
        action: 'create',
        frameworkid: 1,
        parentid: 101,
        shortname: 'Subcompetencia Normalización SQL',
        idnumber: '',
        description: '',
        ruletype: '',
        ruleoutcome: 1,
      });
    });
  });

  it('renders subcompetency courses in read-only mode in courses tab', async () => {
    renderComponent();

    const coursesTabBtn = await screen.findByRole('button', { name: /Cursos y Actividades/i });
    fireEvent.click(coursesTabBtn);

    await waitFor(() => {
      // Direct courses section
      expect(screen.getByText('Cursos Vinculados Directamente')).toBeDefined();
      expect(screen.getByText('Curso de Big Data')).toBeDefined();

      // Subcompetency courses section
      expect(screen.getByText('Cursos de las Subcompetencias')).toBeDefined();
      expect(screen.getByText('Modo Lectura')).toBeDefined();
      expect(screen.getByText('Curso de Python para Data Science')).toBeDefined();
      expect(screen.getByText('PY-DATA')).toBeDefined();
      expect(screen.getByText('Ver Subcompetencia')).toBeDefined();
    });

    // Subcompetency course has read-only completion rule badge (no combobox for subcompetency course)
    const pythonCard = screen.getByText('Curso de Python para Data Science').closest('div');
    expect(pythonCard).toBeDefined();

    // Click "Ver Subcompetencia" button
    const viewSubcompBtn = screen.getByText('Ver Subcompetencia');
    fireEvent.click(viewSubcompBtn);
    expect(mockNavigateToDetail).toHaveBeenCalledWith('competency', {
      frameworkId: 1,
      competencyId: 201,
    });
  });
});

