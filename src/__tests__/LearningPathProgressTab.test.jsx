import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LearningPathProgressTab } from '../views/learning_paths/LearningPathProgressTab';

describe('LearningPathProgressTab', () => {
  const mockPath = {
    sections: [
      { id: 1, name: 'Módulo 1: Fundamentos', cm_id: 101 },
      { id: 2, name: 'Módulo 2: Avanzado', cm_id: 102 },
    ],
    progress_matrix: [
      {
        user_id: 10,
        fullname: 'Juan Pérez',
        email: 'juan@example.com',
        completions: {
          101: 1, // Completado
          102: 0, // Pendiente
        },
      },
      {
        user_id: 20,
        fullname: 'María Gómez',
        email: 'maria@example.com',
        completions: {
          101: 3, // Fallido
          102: 2, // Completado
        },
      },
    ],
  };

  it('renders student count and modules summary', () => {
    render(<LearningPathProgressTab path={mockPath} />);

    expect(screen.getByText('2 estudiantes monitoreados')).toBeDefined();
    expect(screen.getByText('2 módulos formativos')).toBeDefined();
    expect(screen.getByText('Juan Pérez')).toBeDefined();
    expect(screen.getByText('María Gómez')).toBeDefined();
  });

  it('renders empty state when there are no enrolled students', () => {
    render(<LearningPathProgressTab path={{ sections: [], progress_matrix: [] }} />);

    expect(screen.getByText(/No hay estudiantes activos en esta ruta/i)).toBeDefined();
  });
});
