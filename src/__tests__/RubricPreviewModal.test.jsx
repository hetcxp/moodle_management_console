import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RubricPreviewModal } from '../views/rubrics/RubricPreviewModal';

describe('RubricPreviewModal', () => {
  const mockRubric = {
    id: 42,
    name: 'Rúbrica de Programación Modular',
    description: '<p>Evalúa buenas prácticas y arquitectura modular.</p>',
    author_name: 'Profesor X',
    timemodified: 1700000000,
    max_score: 100,
    criteria_count: 2,
    criteria: [
      {
        id: 1,
        sortorder: 1,
        description: 'Cohesión y Acoplamiento',
        levels: [
          { id: 10, score: 0, definition: 'Código espagueti sin modularidad' },
          { id: 11, score: 50, definition: 'Modularidad parcial con acoplamiento medio' },
          { id: 12, score: 100, definition: 'Alta cohesión y bajo acoplamiento' },
        ],
      },
      {
        id: 2,
        sortorder: 2,
        description: 'Documentación y Tests',
        levels: [
          { id: 20, score: 0, definition: 'Sin tests ni docs' },
          { id: 21, score: 50, definition: 'Tests presentes pero cobertura parcial' },
          { id: 22, score: 100, definition: 'Tests automatizados con alta cobertura' },
        ],
      },
    ],
  };

  it('returns null if rubric is null or undefined', () => {
    const { container } = render(<RubricPreviewModal open={true} onClose={vi.fn()} rubric={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders rubric details, criteria, and levels when open', () => {
    const onClose = vi.fn();
    render(<RubricPreviewModal open={true} onClose={onClose} rubric={mockRubric} />);

    expect(screen.getByText('Rúbrica de Programación Modular')).toBeDefined();
    expect(screen.getByText(/Profesor X/)).toBeDefined();
    expect(screen.getAllByText('100 pts').length).toBeGreaterThan(0);
    expect(screen.getByText('2 criterios')).toBeDefined();

    expect(screen.getByText('Cohesión y Acoplamiento')).toBeDefined();
    expect(screen.getByText('Documentación y Tests')).toBeDefined();
    expect(screen.getByText('Alta cohesión y bajo acoplamiento')).toBeDefined();
    expect(screen.getByText('Tests automatizados con alta cobertura')).toBeDefined();

    const closeBtn = screen.getByText('Cerrar');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
