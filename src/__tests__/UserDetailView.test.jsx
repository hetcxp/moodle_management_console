import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserDetailView } from '../views/UserDetailView';
import { UserCoursesTab } from '../views/users/UserCoursesTab';
import { UserCompetenciesTab } from '../views/users/UserCompetenciesTab';
import { ToastProvider } from '../components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock AdminerApi
vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getUserDetail: vi.fn(),
    getCourseUserDetail: vi.fn().mockResolvedValue({ activities: [] }),
    getAutologinUrl: vi.fn().mockResolvedValue({ url: 'http://localhost/moodle' }),
  },
}));

// Mock AuthContext & usePermission
vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    isAuthenticated: true,
    permissions: { is_siteadmin: 1, can_update_courses: 1, can_manage_courses: 1, can_update_users: 1 },
  }),
}));

vi.mock('../hooks/usePermission', () => ({
  usePermission: () => true,
  usePermissionsHelper: () => ({ permissions: { is_siteadmin: 1 }, has: () => true }),
}));

// Mock API_CONFIG
vi.mock('../config/api', () => ({
  API_CONFIG: { baseUrl: 'http://localhost/moodle' },
}));

const mockUserData = {
  id: 10,
  username: 'juan.perez',
  fullname: 'Juan Pérez',
  email: 'juan@example.com',
  is_active: 1,
  suspended: 0,
  lastaccess: 1700000000,
  enrolled_courses: 2,
  completed_courses: 1,
  cohorts_count: 1,
  progress: 50,
  system_roles: [{ id: 5, name: 'Estudiante', shortname: 'student' }],
  cohorts: [{ id: 101, name: 'Cohorte 2026', idnumber: 'COH-2026' }],
  courses: [
    {
      id: 201,
      fullname: 'Curso de Matemáticas',
      shortname: 'MAT-101',
      progress: 100,
      enrolstatus: 0,
      enrolmethod: 'manual',
      enrolments: [{ method: 'manual', status: 0, timestart: 1700000000, timeend: 0 }],
    },
    {
      id: 202,
      fullname: 'Curso de Historia',
      shortname: 'HIS-201',
      progress: 0,
      enrolstatus: 1,
      enrolmethod: 'manual',
      enrolments: [{ method: 'manual', status: 1, timestart: 1700000000, timeend: 0 }],
    },
  ],
  competencies: [
    {
      id: 301,
      shortname: 'Pensamiento Crítico',
      idnumber: 'COMP-PC-01',
      description: 'Capacidad de análisis reflexivo',
      frameworkid: 1,
      frameworkname: 'Habilidades del Siglo XXI',
      proficiency: 1,
      status: 0,
      statusname: 'Competente',
      grade: 2,
      gradename: 'Competente',
      courses: [
        { id: 201, fullname: 'Curso de Matemáticas', shortname: 'MAT-101', is_enrolled: 1 }
      ],
      evidences_count: 1,
      evidences: [
        {
          id: 401,
          action: 0,
          actionname: 'Evidencia manual',
          actionuserfullname: 'Profesor Carlos',
          descidentifier: '',
          note: 'Aprobó con nota sobresaliente',
          url: '',
          grade: 2,
          timecreated: 1700000000,
          timecreated_str: '01/01/2026',
        }
      ]
    },
    {
      id: 302,
      shortname: 'Comunicación Asertiva',
      idnumber: 'COMP-CA-02',
      description: 'Expresión clara y respetuosa',
      frameworkid: 1,
      frameworkname: 'Habilidades del Siglo XXI',
      proficiency: 0,
      status: 1,
      statusname: 'En revisión',
      grade: 1,
      gradename: 'En desarrollo',
      courses: [],
      evidences_count: 0,
      evidences: []
    }
  ]
};

let mockLoading = false;
let mockData = mockUserData;

// Mock useUserDetail hook
vi.mock('../hooks/useAdminerQueries', () => ({
  useUserDetail: () => ({
    data: mockData,
    isLoading: mockLoading,
    error: null,
  }),
  useUserCohortAction: () => ({ mutateAsync: vi.fn() }),
  useUserCourseAction: () => ({ mutateAsync: vi.fn() }),
  useUserAction: () => ({ mutateAsync: vi.fn() }),
}));

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>
  );
}

describe('Refactor Vista Detalle de Usuario', () => {
  beforeEach(() => {
    mockLoading = false;
    mockData = mockUserData;
  });

  it('UserCoursesTab renderiza la FilterBar con búsqueda y filtro de estado', () => {
    renderWithProviders(
      <UserCoursesTab
        courses={mockUserData.courses}
        loading={false}
        userId={10}
        userFullname="Juan Pérez"
        onOpenSelector={vi.fn()}
        handleUnenrollCourse={vi.fn()}
        handleBulkUnenrollCourses={vi.fn()}
        handleUserCourseAction={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    // FilterBar presente con placeholder
    expect(screen.getByPlaceholderText('Buscar por nombre o código de curso...')).toBeDefined();

    // Filtro de estado presente
    const statusSelect = screen.getByLabelText('Filtrar por Estado');
    expect(statusSelect).toBeDefined();
    expect(statusSelect.value).toBe('-1');
  });

  it('UserCoursesTab no contiene columna independiente de Estado y contiene el badge en la columna Curso', () => {
    renderWithProviders(
      <UserCoursesTab
        courses={mockUserData.courses}
        loading={false}
        userId={10}
        userFullname="Juan Pérez"
        onOpenSelector={vi.fn()}
        handleUnenrollCourse={vi.fn()}
        handleBulkUnenrollCourses={vi.fn()}
        handleUserCourseAction={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    // La cabecera th NO debe contener una columna independiente "Estado"
    const tableHeaders = screen.getAllByRole('columnheader').map(th => th.textContent.trim());
    expect(tableHeaders).not.toContain('Estado');
    expect(tableHeaders).toContain('Curso');
    expect(tableHeaders).toContain('Matriculaciones');
    expect(tableHeaders).toContain('Progreso');

    // Dentro de las filas, se debe mostrar el badge de Activo / Suspendido junto al shortname
    expect(screen.getByText('Activo')).toBeDefined();
    expect(screen.getByText('Suspendido')).toBeDefined();
    expect(screen.getByText('MAT-101')).toBeDefined();
    expect(screen.getByText('HIS-201')).toBeDefined();
  });

  it('UserCoursesTab filtra cursos por texto y por estado correctamente', async () => {
    renderWithProviders(
      <UserCoursesTab
        courses={mockUserData.courses}
        loading={false}
        userId={10}
        userFullname="Juan Pérez"
        onOpenSelector={vi.fn()}
        handleUnenrollCourse={vi.fn()}
        handleBulkUnenrollCourses={vi.fn()}
        handleUserCourseAction={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    // Filtrar por texto "Matemáticas"
    const searchInput = screen.getByPlaceholderText('Buscar por nombre o código de curso...');
    fireEvent.change(searchInput, { target: { value: 'Matemáticas' } });

    await waitFor(() => {
      expect(screen.getByText('Curso de Matemáticas')).toBeDefined();
      expect(screen.queryByText('Curso de Historia')).toBeNull();
    }, { timeout: 1500 });

    // Limpiar búsqueda
    fireEvent.change(searchInput, { target: { value: '' } });
    await waitFor(() => {
      expect(screen.getByText('Curso de Historia')).toBeDefined();
    }, { timeout: 1500 });

    // Filtrar por estado "Solo Suspendidos" ('1')
    const statusSelect = screen.getByLabelText('Filtrar por Estado');
    fireEvent.change(statusSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('Curso de Historia')).toBeDefined();
      expect(screen.queryByText('Curso de Matemáticas')).toBeNull();
    });
  });

  it('UserDetailView incluye pestaña Competencias con contador y permite cambiar de tab', () => {
    renderWithProviders(
      <UserDetailView userId={10} onBack={vi.fn()} onNavigateToDetail={vi.fn()} />
    );

    // Botón de pestaña "Competencias" con contador 2
    const competenciesTabBtn = screen.getByRole('button', { name: /Competencias/i });
    expect(competenciesTabBtn).toBeDefined();
    expect(competenciesTabBtn.textContent).toContain('2');

    // Cambiar a la pestaña de Competencias
    fireEvent.click(competenciesTabBtn);

    // Verificar que se visualiza el contenido de competencias
    expect(screen.getByText('Pensamiento Crítico')).toBeDefined();
    expect(screen.getByText('COMP-PC-01')).toBeDefined();
    expect(screen.getByText('Comunicación Asertiva')).toBeDefined();
  });

  it('UserCompetenciesTab muestra cursos vinculados, estado y permite abrir modal de evidencias', () => {
    renderWithProviders(
      <UserCompetenciesTab
        competencies={mockUserData.competencies}
        loading={false}
        userId={10}
        userFullname="Juan Pérez"
        onNavigateToDetail={vi.fn()}
      />
    );

    // Curso vinculado renderizado
    expect(screen.getByText('MAT-101')).toBeDefined();

    // Estados
    expect(screen.getAllByText('Competente').length).toBeGreaterThan(0);
    expect(screen.getAllByText('En revisión').length).toBeGreaterThan(0);

    // Botón de evidencias presente para Pensamiento Crítico
    const evidenceBtn = screen.getByRole('button', { name: /1/i });
    expect(evidenceBtn).toBeDefined();

    // Click para abrir modal con evidencias
    fireEvent.click(evidenceBtn);
    expect(screen.getByText('Aprobó con nota sobresaliente')).toBeDefined();
    expect(screen.getByText('Profesor Carlos')).toBeDefined();

    // Cerrar modal
    fireEvent.click(screen.getByRole('button', { name: /Cerrar/i }));

    // Click en botón de evidencias para Comunicación Asertiva (0 evidencias)
    const allEvidenceBtns = screen.getAllByRole('button', { name: /Evidencias/i });
    expect(allEvidenceBtns.length).toBe(2);
    fireEvent.click(allEvidenceBtns[1]);

    // Modal muestra estado vacío
    expect(screen.getByText('Sin evidencias registradas')).toBeDefined();
  });

  it('UserCompetenciesTab muestra mensaje de estado vacío cuando no tiene competencias', () => {
    renderWithProviders(
      <UserCompetenciesTab
        competencies={[]}
        loading={false}
        userId={10}
        userFullname="Juan Pérez"
        onNavigateToDetail={vi.fn()}
      />
    );

    expect(screen.getByText('No se encontraron competencias asignadas para este usuario.')).toBeDefined();
  });

  it('UserDetailView muestra indicador de carga cuando isLoading es true y no hay data', () => {
    mockLoading = true;
    mockData = null;

    const { container } = renderWithProviders(
      <UserDetailView userId={10} onBack={vi.fn()} onNavigateToDetail={vi.fn()} />
    );

    expect(container.querySelector('.animate-spin')).toBeDefined();
  });
});
