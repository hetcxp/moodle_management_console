import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LearningPathCohortsTab } from '../views/learning_paths/LearningPathCohortsTab';

vi.mock('../hooks/useAdminerQueries', () => ({
  useCohorts: () => ({
    data: {
      cohorts: [
        { id: 2, name: 'Cohorte Disponible', members_count: 10 },
      ],
    },
    isLoading: false,
  }),
}));

describe('LearningPathCohortsTab', () => {
  const mockPath = {
    cohorts: [
      { cohort_id: 1, name: 'Cohorte Asignada', member_count: 25 },
    ],
  };

  it('renders assigned cohorts list and vinculation action', () => {
    const onAssignCohorts = vi.fn();
    const onRemoveCohort = vi.fn();

    render(
      <LearningPathCohortsTab
        path={mockPath}
        onAssignCohorts={onAssignCohorts}
        onRemoveCohort={onRemoveCohort}
      />
    );

    expect(screen.getByText('Cohorte Asignada')).toBeDefined();
    expect(screen.getByText(/25 estudiantes/i)).toBeDefined();

    const addBtn = screen.getByTitle('Asignar Cohorte');
    fireEvent.click(addBtn);

    expect(screen.getByText('Asignar Cohorte a la Ruta')).toBeDefined();
  });

  it('renders empty message when no cohorts are assigned', () => {
    render(
      <LearningPathCohortsTab
        path={{ cohorts: [] }}
        onAssignCohorts={vi.fn()}
        onRemoveCohort={vi.fn()}
      />
    );

    expect(screen.getByText(/No hay cohortes asignadas a esta ruta/i)).toBeDefined();
  });
});
