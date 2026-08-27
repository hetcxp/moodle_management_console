import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { DashboardView } from '../views/DashboardView';
import { LoginView } from '../views/LoginView';
import { ReportsView } from '../views/ReportsView';
import { CategoriesView } from '../views/CategoriesView';
import { CohortsView } from '../views/CohortsView';
import { CoursesView } from '../views/CoursesView';
import { AdminerApi } from '../services/adminer-api';

vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getDashboardKpis: vi.fn().mockResolvedValue({ total_users: 0, total_courses: 0, active_users: 0, total_cohorts: 0, users_trend: 0, courses_trend: 0, active_trend: 0, cohorts_trend: 0 }),
    getRecentActivity: vi.fn().mockResolvedValue([]),
    getCategories: vi.fn().mockResolvedValue({ categories: [], totalcount: 0 }),
    getCategoriesFlat: vi.fn().mockResolvedValue({ categories: [] }),
    getCohorts: vi.fn().mockResolvedValue({ cohorts: [], totalcount: 0 }),
    getCourses: vi.fn().mockResolvedValue({ courses: [], totalcount: 0 }),
    getUsers: vi.fn().mockResolvedValue({ users: [], totalcount: 0 }),
  },
}));

describe('Smoke tests for views', () => {
  it('renders DashboardView correctly', () => {
    renderWithProviders(<DashboardView />);
    expect(screen.getByText('Resumen General')).toBeDefined();
  });

  it('renders ReportsView correctly', () => {
    renderWithProviders(<ReportsView />);
    expect(screen.getByText('Dashboard de Reportería')).toBeDefined();
  });

  it('renders CategoriesView correctly', () => {
    renderWithProviders(<CategoriesView />);
    expect(screen.getByText('Categorías de Cursos')).toBeDefined();
  });

  it('renders CohortsView correctly', () => {
    renderWithProviders(<CohortsView />);
    expect(screen.getByText('Cohortes de Moodle')).toBeDefined();
  });

  it('renders CoursesView correctly', () => {
    renderWithProviders(<CoursesView />);
    expect(screen.getByText('Gestión de Cursos')).toBeDefined();
  });
});
