import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LearningPathDetailKpis } from '../views/learning_paths/LearningPathDetailKpis';

describe('LearningPathDetailKpis', () => {
  it('renders default zero stats when path has no users or sections', () => {
    render(<LearningPathDetailKpis path={{}} />);

    expect(screen.getByText('Matriculados')).toBeDefined();
    expect(screen.getByText('Culminados')).toBeDefined();
    expect(screen.getByText('Avance Promedio')).toBeDefined();
    expect(screen.getByText('Estructura')).toBeDefined();
    expect(screen.getByText('Avance libre')).toBeDefined();
  });

  it('calculates completion and progress stats from user list', () => {
    const mockPath = {
      users: [
        { status: 0, progress: 100 },
        { status: 0, progress: 50 },
        { status: 1, progress: 0 },
      ],
      sections: [
        { subcourse_course_id: 10 },
        { subcourse_course_id: 20 },
      ],
      enforce_sequence: 1,
    };

    render(<LearningPathDetailKpis path={mockPath} />);

    expect(screen.getByText('3')).toBeDefined(); // totalUsers
    expect(screen.getByText(/2 activos/i)).toBeDefined();
    expect(screen.getByText(/1 suspendidos/i)).toBeDefined();
    expect(screen.getByText('(33%)')).toBeDefined(); // completionRate: 1/3
    expect(screen.getByText('50%')).toBeDefined(); // avgProgress: (100+50+0)/3 = 50%
    expect(screen.getByText(/1 en curso/i)).toBeDefined();
    expect(screen.getByText('Secuencial estricto')).toBeDefined();
  });
});
