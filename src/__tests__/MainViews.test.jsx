import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { DashboardView } from '../views/DashboardView';
import { ReportsView } from '../views/ReportsView';
import { CategoriesView } from '../views/CategoriesView';
import { CohortsView } from '../views/CohortsView';
import { CoursesView } from '../views/CoursesView';

vi.mock('../services/adminer-api', () => import('./__mocks__/adminer-api'));

describe('Smoke tests for views', () => {
  it('renders DashboardView correctly', () => {
    renderWithProviders(<DashboardView />);
    expect(screen.getByText('Resumen General')).toBeDefined();
    expect(screen.getByRole('button', { name: /Actualizar/i })).toBeDefined();
  });

  it('renders ReportsView correctly with all report cards and download buttons', () => {
    renderWithProviders(<ReportsView />);
    expect(screen.getByText('Dashboard de Reportería')).toBeDefined();
    expect(screen.getByText('Descarga la información de la plataforma en formato CSV.')).toBeDefined();
    expect(screen.getByText('Directorio de Cursos')).toBeDefined();
    expect(screen.getByText('Directorio de Categorías')).toBeDefined();
    expect(screen.getByText('Listado de Usuarios')).toBeDefined();
    expect(screen.getByText('Listado de Cohortes')).toBeDefined();

    const summaryButtons = screen.getAllByRole('button', { name: /Resumen/i });
    expect(summaryButtons.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole('button', { name: /Detalle de Curso/i })).toBeDefined();
  });

  it('renders CategoriesView correctly', () => {
    renderWithProviders(<CategoriesView />);
    expect(screen.getByText('Categorías de Cursos')).toBeDefined();
    expect(screen.getByPlaceholderText(/categoría/i)).toBeDefined();
  });

  it('renders CohortsView correctly', () => {
    renderWithProviders(<CohortsView />);
    expect(screen.getByText('Cohortes de Moodle')).toBeDefined();
    expect(screen.getByPlaceholderText(/cohorte/i)).toBeDefined();
  });

  it('renders CoursesView correctly', () => {
    renderWithProviders(<CoursesView />);
    expect(screen.getByText('Gestión de Cursos')).toBeDefined();
    expect(screen.getByPlaceholderText(/curso/i)).toBeDefined();
  });
});
