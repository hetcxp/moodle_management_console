import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseDetailKpis } from '../views/courses/CourseDetailKpis';

describe('CourseDetailKpis component', () => {
  it('renders gracefully with empty users array', () => {
    render(<CourseDetailKpis users={[]} />);

    expect(screen.getByText('Matriculados')).toBeDefined();
    expect(screen.getByText('Culminados')).toBeDefined();
    expect(screen.getByText('Avance Promedio')).toBeDefined();
    expect(screen.getByText('Sin Iniciar')).toBeDefined();

    expect(screen.getByText('0 activos')).toBeDefined();
    expect(screen.getByText('0 suspendidos')).toBeDefined();
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
  });

  it('calculates total, active and suspended enrolments accurately', () => {
    const mockUsers = [
      { id: 1, fullname: 'User One', status: 0, progress: 100 },
      { id: 2, fullname: 'User Two', status: 0, progress: 50 },
      { id: 3, fullname: 'User Three', status: 1, progress: 0 },
    ];

    render(<CourseDetailKpis users={mockUsers} />);

    // Total matriculados: 3
    expect(screen.getByText('3')).toBeDefined();
    // 2 activos
    expect(screen.getByText('2 activos')).toBeDefined();
    // 1 suspendido
    expect(screen.getByText('1 suspendidos')).toBeDefined();
  });

  it('calculates completed users ratio and completion rate correctly', () => {
    const mockUsers = [
      { id: 1, fullname: 'User One', status: 0, progress: 100 },
      { id: 2, fullname: 'User Two', status: 0, progress: 100 },
      { id: 3, fullname: 'User Three', status: 0, progress: 80 },
      { id: 4, fullname: 'User Four', status: 0, progress: 0 },
    ];

    render(<CourseDetailKpis users={mockUsers} />);

    // Completed: 2 / 4
    expect(screen.getByText('/ 4')).toBeDefined();
    // Tasa de éxito: 50%
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('calculates average progress and distribution of users in progress vs not started', () => {
    const mockUsers = [
      { id: 1, fullname: 'User One', status: 0, progress: 100 },
      { id: 2, fullname: 'User Two', status: 0, progress: 50 },
      { id: 3, fullname: 'User Three', status: 0, progress: 30 },
      { id: 4, fullname: 'User Four', status: 0, progress: 0 },
    ];
    // avg: (100 + 50 + 30 + 0) / 4 = 45%
    // in progress: 2 (50, 30)
    // not started: 1 (0)

    render(<CourseDetailKpis users={mockUsers} />);

    expect(screen.getByText('45%')).toBeDefined();
    expect(screen.getByText('2 en curso')).toBeDefined();
    expect(screen.getByText('1 sin iniciar')).toBeDefined();
  });

  it('calculates non-starters and risk rate accurately', () => {
    const mockUsers = [
      { id: 1, fullname: 'User One', status: 0, progress: 0 },
      { id: 2, fullname: 'User Two', status: 0, progress: 0 },
      { id: 3, fullname: 'User Three', status: 0, progress: 50 },
      { id: 4, fullname: 'User Four', status: 1, progress: 100 },
    ];
    // not started: 2 out of 4 = 50%

    render(<CourseDetailKpis users={mockUsers} />);

    const riskElements = screen.getAllByText('50%');
    expect(riskElements.length).toBeGreaterThan(0);
    expect(screen.getByText('En riesgo de rezago')).toBeDefined();
  });
});
