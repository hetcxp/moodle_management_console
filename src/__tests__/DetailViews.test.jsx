import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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
      members: [
        { id: 42, fullname: 'John Doe', email: 'jdoe@example.com', lastaccess: 1725148800, suspended: 0, progress: 80, course_progresses: [] }
      ],
      courses: [
        { id: 301, fullname: 'Python for Data Science', shortname: 'PY-DS', enrolid: 99, enrolledcount: 25 }
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
      coursegroups: []
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
    courseAction: vi.fn().mockResolvedValue({ success: true })
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
  });

  it('renders CategoryDetailView with category details and courses', async () => {
    renderWithProviders(<CategoryDetailView categoryId={7} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Node.js Mastery')).toBeDefined();
  });

  it('renders CohortDetailView with cohort details and members', async () => {
    renderWithProviders(<CohortDetailView cohortId={8} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('Data Science 2026').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('All students in Data Science track')).toBeDefined();
    expect(screen.getByText('John Doe')).toBeDefined();
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
});
