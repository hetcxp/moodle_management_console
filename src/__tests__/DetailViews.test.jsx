import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { UserDetailView } from '../views/UserDetailView';
import { CategoryDetailView } from '../views/CategoryDetailView';
import { CohortDetailView } from '../views/CohortDetailView';
import { CourseUserDetailView } from '../views/CourseUserDetailView';
import { CourseDetailView } from '../views/CourseDetailView';

// Mock AdminerApi
vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getUserDetail: vi.fn().mockResolvedValue({
      id: 42,
      username: 'jdoe',
      fullname: 'John Doe',
      email: 'jdoe@example.com',
      suspended: 0,
      is_active: 1,
      is_admin: 0,
      lastaccess: 1725148800,
      enrolled_courses: 2,
      completed_courses: 1,
      cohorts_count: 1,
      progress: 50,
      system_roles: [
        { id: 3, name: 'Teacher', shortname: 'editingteacher' }
      ],
      courses: [
        {
          id: 101,
          fullname: 'React Fundamentals',
          shortname: 'REACT-101',
          progress: 100,
          enrolmethod: 'manual',
          enrolstatus: 0,
          enrolments: [{ method: 'manual', status: 0, timestart: 1725148800, timeend: 0 }]
        }
      ],
      cohorts: [
        { id: 5, name: 'Frontend Engineers', idnumber: 'FE-2026' }
      ]
    }),
    getCategoryDetail: vi.fn().mockResolvedValue({
      id: 7,
      name: 'Engineering',
      description: 'Engineering courses and subcategories',
      subcategories: [
        { id: 12, name: 'Web Development', coursecount: 4, visible: 1 }
      ],
      courses: [
        { id: 201, fullname: 'Node.js Mastery', shortname: 'NODE-101', visible: 1, enrolledcount: 15, completedcount: 10 }
      ]
    }),
    getCohortDetail: vi.fn().mockResolvedValue({
      id: 8,
      name: 'Data Science 2026',
      idnumber: 'DS-2026',
      description: 'All students in Data Science track',
      progress: 80,
      members: [
        { id: 42, fullname: 'John Doe', email: 'jdoe@example.com', lastaccess: 1725148800, suspended: 0, progress: 80, course_progresses: [{ courseid: 301, progress: 80 }] }
      ],
      courses: [
        { id: 301, fullname: 'Python for Data Science', shortname: 'PY-DS', enrolid: 99, enrolledcount: 25, progress: 80 }
      ]
    }),
    getCourseDetail: vi.fn().mockResolvedValue({
      id: 101,
      fullname: 'React Fundamentals',
      shortname: 'REACT-101',
      categoryname: 'Technology',
      visible: 1,
      timecreated: 1725148800,
      startdate: 1725148800,
      enddate: 0,
      progress: 0,
      enrolledcount: 2,
      users: [
        { id: 42, fullname: 'John Doe', email: 'jdoe@example.com', progress: 75, status: 0, roles: 'student', enrolstatus: 0, enrolments: [] }
      ],
      cohorts: [],
      coursegroups: [],
      competencies: [
        {
          id: 50,
          linkid: 1,
          shortname: 'State Management with Hooks',
          idnumber: 'COMP-HOOKS',
          description: 'Dominio de hooks de React y Context API',
          parentid: 0,
          parentname: '',
          path: '/0/50/',
          frameworkid: 3,
          frameworkname: 'Desarrollo Web Frontend',
          frameworkidnumber: 'FW-FRONTEND',
          frameworkvisible: 1,
          ruleoutcome: 3,
          sortorder: 1,
          activities: [
            {
              id: 10,
              cmid: 1001,
              modname: 'quiz',
              name: 'Quiz 1: Hooks y Context',
              ruleoutcome: 3,
              sortorder: 1
            }
          ]
        }
      ]
    }),
    getCourseUserDetail: vi.fn().mockResolvedValue({
      status: 0,
      user: {
        id: 42,
        fullname: 'John Doe',
        email: 'jdoe@example.com',
        suspended: 0,
        lastaccess: 1725148800,
        enrolstatus: 0,
        enroltimestart: 1725148800,
        enroltimeend: 0
      },
      course: {
        id: 101,
        fullname: 'React Fundamentals',
        shortname: 'REACT-101',
        progress: 75
      },
      enrolments: [
        { method: 'manual', status: 0, timestart: 1725148800, timeend: 0 }
      ],
      activities: [
        { id: 1, name: 'Quiz 1: Hooks', modname: 'quiz', completionstatus: 1, grade: '10/10' }
      ]
    }),
    userAction: vi.fn().mockResolvedValue({ success: true, affectedcount: 1 }),
    userCohortAction: vi.fn().mockResolvedValue({ success: true }),
    userCourseAction: vi.fn().mockResolvedValue({ success: true }),
    categoryAction: vi.fn().mockResolvedValue({ success: true }),
    cohortAction: vi.fn().mockResolvedValue({ success: true }),
    courseUserAction: vi.fn().mockResolvedValue({ success: true }),
    courseCohortAction: vi.fn().mockResolvedValue({ success: true }),
    courseAction: vi.fn().mockResolvedValue({ success: true }),
    getCourses: vi.fn().mockResolvedValue({
      courses: [{ id: 999, fullname: 'External Course', shortname: 'EXT-101' }],
      totalcount: 1
    }),
    getCategoriesFlat: vi.fn().mockResolvedValue({
      categories: [{ id: 7, name: 'Engineering' }]
    })
  }
}));

describe('Detail Views Integration (TD-012)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders UserDetailView with user info, KPIs and enrolled courses', async () => {
    renderWithProviders(<UserDetailView userId={42} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('jdoe@example.com')).toBeDefined();
    expect(screen.getByText('React Fundamentals')).toBeDefined();
    expect(screen.getByText('Clave Temporal')).toBeDefined();
    expect(screen.getByText('Username & Último Acceso')).toBeDefined();
    expect(screen.getByText('Roles de Sistema')).toBeDefined();
    expect(screen.getByText('Teacher')).toBeDefined();
    expect(screen.getByText('Ver en Moodle')).toBeDefined();
  });

  it('renders UserDetailView with no system roles and fallback when is_admin is 1', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    AdminerApi.getUserDetail.mockResolvedValueOnce({
      id: 99,
      username: 'adminuser',
      fullname: 'Admin Master',
      email: 'admin@example.com',
      suspended: 0,
      is_active: 1,
      is_admin: 1,
      lastaccess: 0,
      enrolled_courses: 0,
      completed_courses: 0,
      cohorts_count: 0,
      progress: 0,
      system_roles: [],
      courses: [],
      cohorts: []
    });

    renderWithProviders(<UserDetailView userId={99} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('Admin Master').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Administrador del sitio')).toBeDefined();
  });

  it('renders CategoryDetailView with category details and courses, and opens Traer Curso modal', async () => {
    renderWithProviders(<CategoryDetailView categoryId={7} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Node.js Mastery')).toBeDefined();

    const traerCursoBtn = screen.getByRole('button', { name: /traer curso/i });
    fireEvent.click(traerCursoBtn);

    await waitFor(() => {
      expect(screen.getByText('Traer Cursos a esta Categoría')).toBeDefined();
    });
  });

  it('opens Usuarios Matriculados modal on course row click and navigates to course detail', async () => {
    const onNavigateToDetail = vi.fn();
    renderWithProviders(<CategoryDetailView categoryId={7} onBack={vi.fn()} onNavigateToDetail={onNavigateToDetail} />);

    await waitFor(() => {
      expect(screen.getByText('Node.js Mastery')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Node.js Mastery'));

    await waitFor(() => {
      expect(screen.getByText('Usuarios Matriculados')).toBeDefined();
    });

    const goToDetailBtn = screen.getByRole('button', { name: /ir al detalle del curso/i });
    expect(goToDetailBtn).toBeDefined();

    fireEvent.click(goToDetailBtn);
    expect(onNavigateToDetail).toHaveBeenCalledWith('course', 201);
  });

  it('renders CohortDetailView with cohort details and members', async () => {
    renderWithProviders(<CohortDetailView cohortId={8} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('Data Science 2026').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('All students in Data Science track')).toBeDefined();
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
  });

  it('renders CourseUserDetailView with course progress and user details', async () => {
    renderWithProviders(<CourseUserDetailView courseId={101} userId={42} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
    });

    expect(screen.getByText('jdoe@example.com')).toBeDefined();
    expect(screen.getByText('Activo en Curso')).toBeDefined();
  });

  it('renders CourseDetailView with course name and enrolled users tab', async () => {
    renderWithProviders(<CourseDetailView courseId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('React Fundamentals').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('John Doe')).toBeDefined();
  });

  it('allows editing course fullname, shortname and dates in CourseDetailView', async () => {
    const { AdminerApi } = await import('../services/adminer-api');
    renderWithProviders(<CourseDetailView courseId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Editar curso')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Editar curso'));

    await waitFor(() => {
      expect(screen.getByText('Editar Información del Curso')).toBeDefined();
    });

    const fullnameInput = screen.getByPlaceholderText('Ej: Introducción a Python 3');
    const shortnameInput = screen.getByPlaceholderText('Ej: PY3-101');

    expect(fullnameInput.value).toBe('React Fundamentals');
    expect(shortnameInput.value).toBe('REACT-101');

    fireEvent.change(fullnameInput, { target: { value: 'Advanced React 2026' } });
    fireEvent.change(shortnameInput, { target: { value: 'REACT-ADV' } });

    fireEvent.click(screen.getByText('Guardar Cambios'));

    await waitFor(() => {
      expect(AdminerApi.courseAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          courseids: [101],
          fullname: 'Advanced React 2026',
          shortname: 'REACT-ADV'
        })
      );
    });
  });

  it('renders Competencias tab in CourseDetailView and displays linked competencies in read-only mode', async () => {
    renderWithProviders(<CourseDetailView courseId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /competencias/i })).toBeDefined();
    });

    const compTabBtn = screen.getByRole('button', { name: /competencias/i });
    fireEvent.click(compTabBtn);

    await waitFor(() => {
      expect(screen.getByText('State Management with Hooks')).toBeDefined();
    });

    expect(screen.getByText('COMP-HOOKS')).toBeDefined();
    expect(screen.getByText('Desarrollo Web Frontend')).toBeDefined();
    expect(screen.getAllByText('Marcar completada').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1 actividad')).toBeDefined();

    // Click on Detalle button to open read-only dialog
    const detailBtn = screen.getByRole('button', { name: /detalle/i });
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByText('Información detallada de la vinculación de esta competencia y sus actividades en el curso.')).toBeDefined();
    });

    expect(screen.getByText('Quiz 1: Hooks y Context')).toBeDefined();
    expect(screen.getByRole('button', { name: /cerrar/i })).toBeDefined();
  });
});

