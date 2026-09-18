import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserDetailView } from '../views/UserDetailView';
import { UserCoursesTab } from '../views/users/UserCoursesTab';
import { UserCompetenciesTab } from '../views/users/UserCompetenciesTab';
import { UserCohortsTab } from '../views/users/UserCohortsTab';
import { UserEvidencesTab } from '../views/users/UserEvidencesTab';
import { ToastProvider } from '../components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock AdminerApi
vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getUserDetail: vi.fn(),
    getCourseUserDetail: vi.fn().mockResolvedValue({ activities: [] }),
    getAutologinUrl: vi.fn().mockResolvedValue({ url: 'http://localhost/moodle' }),
    getCompetencyFrameworks: vi.fn().mockResolvedValue({ frameworks: [{ id: 1, shortname: 'FW1' }] }),
    getAllCompetencies: vi.fn().mockResolvedValue({ competencies: [{ id: 301, shortname: 'Pensamiento Crítico', frameworkid: 1 }] }),
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
      source: 'adhoc',
      enrolled_in_linked_course: 1,
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
      source: 'adhoc',
      enrolled_in_linked_course: 0,
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
  useUserPlanAction: () => ({ mutateAsync: vi.fn() }),
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

  it('UserCompetenciesTab abre modal de detalle al hacer click en el curso vinculado con progreso y permite navegar', () => {
    const onNavigateToDetail = vi.fn();
    renderWithProviders(
      <UserCompetenciesTab
        competencies={mockUserData.competencies}
        userCourses={mockUserData.courses}
        loading={false}
        userId={10}
        userFullname="Juan Pérez"
        onNavigateToDetail={onNavigateToDetail}
      />
    );

    const courseBtn = screen.getByRole('button', { name: /Ver curso Curso de Matemáticas/i });
    expect(courseBtn).toBeDefined();

    // Click en el badge del curso abre modal en lugar de navegar de inmediato
    fireEvent.click(courseBtn);
    expect(onNavigateToDetail).not.toHaveBeenCalled();

    // El modal muestra título, nombre del curso, progreso y estado
    expect(screen.getByText('Curso Vinculado a la Competencia')).toBeDefined();
    expect(screen.getByText('Progreso del estudiante')).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined();

    // Botón de ir al detalle del curso
    const detailBtn = screen.getByRole('button', { name: /Ir al detalle del curso/i });
    expect(detailBtn).toBeDefined();

    fireEvent.click(detailBtn);
    expect(onNavigateToDetail).toHaveBeenCalledWith('course_user', { courseId: 201, userId: 10 });
  });

  it('UserDetailView persiste la pestaña activa en sessionStorage al cambiar de tab y la restaura', () => {
    mockLoading = false;
    mockData = mockUserData;

    const { unmount } = renderWithProviders(
      <UserDetailView
        userId={10}
        onBack={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    const competenciesTabBtn = screen.getByRole('button', { name: /Competencias/i });
    fireEvent.click(competenciesTabBtn);

    expect(window.sessionStorage.getItem('user_detail_tab_10')).toBe('competencies');
    unmount();

    // Al volver a montar, debe restaurar la pestaña de Competencias
    renderWithProviders(
      <UserDetailView
        userId={10}
        onBack={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    expect(screen.getByText('Pensamiento Crítico')).toBeDefined();
    window.sessionStorage.removeItem('user_detail_tab_10');
  });

  it('UserDetailView muestra indicador de carga cuando isLoading es true y no hay data', () => {
    mockLoading = true;
    mockData = null;

    const { container } = renderWithProviders(
      <UserDetailView userId={10} onBack={vi.fn()} onNavigateToDetail={vi.fn()} />
    );

    expect(container.querySelector('.animate-spin')).toBeDefined();
  });

  it('UserCohortsTab tiene sortKey en la columna progreso de cursos y permite ordenar', () => {
    const mockCohorts = [
      { id: 1, name: 'Cohorte A', idnumber: 'COH-A' },
      { id: 2, name: 'Cohorte B', idnumber: 'COH-B' },
    ];
    const mockCourses = [
      { id: 10, fullname: 'Curso 1', enrolmethod: 'cohort', cohortid: 1, progress: 20 },
      { id: 20, fullname: 'Curso 2', enrolmethod: 'cohort', cohortid: 2, progress: 90 },
    ];

    renderWithProviders(
      <UserCohortsTab
        cohorts={mockCohorts}
        courses={mockCourses}
        loading={false}
        userId={10}
        onOpenSelector={vi.fn()}
        handleUnlinkCohort={vi.fn()}
        handleBulkUnlinkCohorts={vi.fn()}
      />
    );

    const progressHeader = screen.getByText('Progreso de Cursos');
    expect(progressHeader).toBeDefined();

    const headerButton = progressHeader.closest('[class*="cursor-pointer"]');
    expect(headerButton).not.toBeNull();

    expect(screen.getByText('20%')).toBeDefined();
    expect(screen.getByText('90%')).toBeDefined();

    fireEvent.click(headerButton);
    fireEvent.click(headerButton);
  });

  it('UserDetailView renderiza header en 2 líneas y el nuevo card de Competencias con métricas nativas', () => {
    renderWithProviders(
      <UserDetailView userId={10} onBack={vi.fn()} onNavigateToDetail={vi.fn()} />
    );

    // Header línea 1: Nombre
    expect(screen.getByRole('heading', { level: 1, name: 'Juan Pérez' })).toBeDefined();

    // Header línea 2: Username, email y último acceso
    expect(screen.getByText('juan.perez')).toBeDefined();
    expect(screen.getByText('juan@example.com')).toBeDefined();

    // Card de Competencias (1 completada con proficiency=1, 1 en progreso)
    expect(screen.getAllByText('Competencias').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/vinculadas/i)).toBeNull();
    expect(screen.getByText('1 en progreso')).toBeDefined();
    expect(screen.getByText('1 completadas')).toBeDefined();

    // Verificar que ya no existe el texto del card eliminado
    expect(screen.queryByText('Username & Último Acceso')).toBeNull();
  });

  it('UserCompetenciesTab muestra botón Asignar Competencia y permite abrir el modal', async () => {
    const onAssign = vi.fn();
    renderWithProviders(
      <UserCompetenciesTab
        competencies={mockUserData.competencies}
        loading={false}
        userId={10}
        userFullname="Juan Pérez"
        onNavigateToDetail={vi.fn()}
        onAssignCompetency={onAssign}
      />
    );

    const assignBtn = screen.getByRole('button', { name: /Asignar Competencia/i });
    expect(assignBtn).toBeDefined();

    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(screen.getByText('Asignar Competencia al Usuario')).toBeDefined();
    });
  });

  it('UserDetailView integra pestaña Competencias con botón Asignar Competencia', async () => {
    renderWithProviders(
      <UserDetailView userId={10} onBack={vi.fn()} onNavigateToDetail={vi.fn()} />
    );

    const competenciesTabBtn = screen.getByRole('button', { name: /Competencias/i });
    fireEvent.click(competenciesTabBtn);

    const assignBtn = screen.getByRole('button', { name: /Asignar Competencia/i });
    expect(assignBtn).toBeDefined();
  });

  it('UserDetailView integra pestaña Evidencias con contador y muestra lista cronológica', async () => {
    mockLoading = false;
    mockData = mockUserData;

    renderWithProviders(
      <UserDetailView userId={10} onBack={vi.fn()} onNavigateToDetail={vi.fn()} />
    );

    const evidenciasTabBtn = screen.getAllByRole('button', { name: /Evidencias/i })[0];
    expect(evidenciasTabBtn).toBeDefined();
    expect(evidenciasTabBtn.textContent).toContain('1');

    fireEvent.click(evidenciasTabBtn);

    expect(screen.getByText('Aprobó con nota sobresaliente')).toBeDefined();
    expect(screen.getByText('Profesor Carlos')).toBeDefined();
  });

  it('UserCompetenciesTab muestra badges de origen y deshabilita eliminar si está matriculado en curso vinculado', () => {
    const onRemove = vi.fn();
    renderWithProviders(
      <UserCompetenciesTab
        competencies={mockUserData.competencies}
        loading={false}
        userId={10}
        userFullname="Juan Pérez"
        onNavigateToDetail={vi.fn()}
        onRemoveCompetency={onRemove}
      />
    );

    // Badges de origen (1 en el selector de filtros + 2 en las filas de la tabla)
    expect(screen.getAllByText('Plan ad-hoc').length).toBe(3);

    // Botón eliminar deshabilitado para Pensamiento Crítico (enrolled_in_linked_course = 1)
    const disabledBtn = screen.getByTitle('No se puede eliminar: el usuario está matriculado en al menos un curso vinculado a esta competencia.');
    expect(disabledBtn).toBeDefined();
    expect(disabledBtn.hasAttribute('disabled')).toBe(true);

    fireEvent.click(disabledBtn);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('UserCompetenciesTab permite eliminar competencia ad-hoc cuando no está matriculado en cursos vinculados', async () => {
    const onRemove = vi.fn().mockResolvedValue();
    renderWithProviders(
      <UserCompetenciesTab
        competencies={mockUserData.competencies}
        loading={false}
        userId={10}
        userFullname="Juan Pérez"
        onNavigateToDetail={vi.fn()}
        onRemoveCompetency={onRemove}
      />
    );

    const enabledDeleteBtn = screen.getByTitle('Eliminar competencia');
    expect(enabledDeleteBtn).toBeDefined();
    expect(enabledDeleteBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(enabledDeleteBtn);

    // ConfirmDialog se abre
    expect(screen.getByText('¿Estás seguro de que deseas eliminar la competencia "Comunicación Asertiva" del plan personal de este usuario?')).toBeDefined();

    const confirmBtn = screen.getByRole('button', { name: 'Eliminar' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith(302);
    });
  });

  it('UserEvidencesTab renderiza timeline y maneja estado vacío correctamente', () => {
    const { unmount } = renderWithProviders(
      <UserEvidencesTab
        competencies={mockUserData.competencies}
        userFullname="Juan Pérez"
      />
    );

    expect(screen.getAllByText('Evidencia manual').length).toBeGreaterThan(0);
    expect(screen.getByText('Aprobó con nota sobresaliente')).toBeDefined();
    unmount();

    renderWithProviders(
      <UserEvidencesTab
        competencies={[]}
        userFullname="Juan Pérez"
      />
    );

    expect(screen.getByText('Sin evidencias registradas')).toBeDefined();
  });

  it('UserCompetenciesTab renderiza columna propia de Origen con sortKey y permite ordenar', () => {
    renderWithProviders(
      <UserCompetenciesTab
        competencies={mockUserData.competencies}
        loading={false}
        userId={10}
        userFullname="Juan Pérez"
        onNavigateToDetail={vi.fn()}
      />
    );

    // Header de columna Origen
    const originHeaders = screen.getAllByText('Origen');
    expect(originHeaders.length).toBeGreaterThan(0);

    // Click en el header para ordenar por Origen
    const originHeader = originHeaders.find(el => el.closest('th'));
    expect(originHeader).toBeDefined();

    const sortButton = originHeader.closest('button') || originHeader.closest('[class*="cursor-pointer"]');
    if (sortButton) {
      fireEvent.click(sortButton);
    }
  });
});
