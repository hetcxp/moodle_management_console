import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompetencyFrameworkDetailView } from '../views/CompetencyFrameworkDetailView';
import { ToastProvider } from '../components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock AdminerApi
vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getCompetencyFrameworkDetail: vi.fn().mockResolvedValue({
      id: 1,
      shortname: 'Marco de Habilidades 2026',
      idnumber: 'HAB-2026',
      description: 'Marco de prueba',
      visible: 1,
      scaleid: 1,
      scalename: 'Escala Estándar',
      competenciescount: 1,
      timemodified: 1725148800,
      competencies: [
        {
          id: 101,
          shortname: 'Competencia en Datos',
          idnumber: 'DAT-01',
          description: 'Habilidad de análisis de datos',
          parentid: 0,
          path: '/0/101/',
          sortorder: 1,
          coursescount: 2,
          timecreated: 1725148800,
          timemodified: 1725148800,
        },
      ],
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
          ruleoutcome: 1,
          sortorder: 1,
          timecreated: 1725148800,
        },
        {
          id: 20,
          fullname: 'Machine Learning Básico',
          shortname: 'ML-101',
          idnumber: 'DATA-ML',
          visible: 1,
          category: 1,
          categoryname: 'Tecnología',
          ruleoutcome: 1,
          sortorder: 2,
          timecreated: 1725148800,
        },
      ],
    }),
    getCourses: vi.fn().mockResolvedValue({
      totalcount: 3,
      page: 0,
      perpage: 10,
      courses: [
        { id: 10, fullname: 'Curso de Big Data', shortname: 'BD-101' },
        { id: 20, fullname: 'Machine Learning Básico', shortname: 'ML-101' },
        { id: 30, fullname: 'Deep Learning Avanzado', shortname: 'DL-201' },
      ],
    }),
    competencyCourseAction: vi.fn().mockResolvedValue({
      success: true,
      message: 'Operación de cursos exitosa',
      affectedcount: 1,
    }),
    competencyAction: vi.fn().mockResolvedValue({
      success: true,
      message: 'OK',
      affectedcount: 1,
    }),
    competencyFrameworkAction: vi.fn().mockResolvedValue({
      success: true,
      message: 'OK',
      affectedcount: 1,
    }),
    getCompetencyReviews: vi.fn().mockResolvedValue({
      totalcount: 1,
      reviews: [
        {
          usercompid: 88,
          userid: 3,
          userfullname: 'Alumno Prueba',
          useremail: 'alumno@test.com',
          competencyid: 101,
          competencyname: 'Competencia en Datos',
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

describe('CompetencyFrameworkDetailView & CompetencyCoursesModal', () => {
  let queryClient;
  const mockNavigateToDetail = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CompetencyFrameworkDetailView
            frameworkId={1}
            onBack={vi.fn()}
            onNavigateToDetail={mockNavigateToDetail}
            {...props}
          />
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders framework details, competencies table and linked courses count badge', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Marco de Habilidades 2026')).toBeDefined();
      expect(screen.getByText('Competencia en Datos')).toBeDefined();
      expect(screen.getByText('2 curso(s)')).toBeDefined();
    });
  });

  it('opens competency pending reviews modal when clicking reviews action button in table', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Competencia en Datos')).toBeDefined();
    });

    const reviewsBtn = screen.getByTitle(/Ver revisiones pendientes/i);
    fireEvent.click(reviewsBtn);

    await waitFor(() => {
      expect(screen.getByText('Alumno Prueba')).toBeDefined();
      expect(screen.getByText(/alumno@test.com/i)).toBeDefined();
    });
  });

  it('navigates to competency detail view when clicking on courses button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('2 curso(s)')).toBeDefined();
    });

    const coursesBadgeBtn = screen.getByText('2 curso(s)');
    fireEvent.click(coursesBadgeBtn);

    expect(mockNavigateToDetail).toHaveBeenCalledWith('competency', {
      frameworkId: 1,
      competencyId: 101,
    });
  });

  it('navigates to competency detail view when clicking competency row name', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Competencia en Datos')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Competencia en Datos'));

    expect(mockNavigateToDetail).toHaveBeenCalledWith('competency', {
      frameworkId: 1,
      competencyId: 101,
    });
  });
});


