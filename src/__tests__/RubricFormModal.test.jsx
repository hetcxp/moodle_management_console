import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RubricFormModal } from '../views/rubrics/RubricFormModal';

describe('RubricFormModal', () => {
  it('does not render dialog content when open is false', () => {
    const { queryByText } = render(
      <RubricFormModal open={false} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(queryByText('Nueva Plantilla de Rúbrica')).toBeNull();
  });

  it('renders creation form with initial default criterion and levels', () => {
    render(
      <RubricFormModal open={true} onClose={vi.fn()} onSave={vi.fn()} />
    );

    expect(screen.getByText('Nueva Plantilla de Rúbrica')).toBeDefined();
    expect(screen.getByText('Puntaje Máximo Calculado')).toBeDefined();
    expect(screen.getByText('Niveles de Desempeño')).toBeDefined();
  });

  it('validates rubric name and shows error if submitted empty', async () => {
    render(
      <RubricFormModal open={true} onClose={vi.fn()} onSave={vi.fn()} />
    );

    const submitBtn = screen.getByText('Crear Plantilla');
    fireEvent.click(submitBtn);

    expect(screen.getByText(/plantilla de rúbrica es obligatorio/i)).toBeDefined();
  });

  it('fills fields, adds a criterion and submits valid payload', async () => {
    const onSave = vi.fn().mockResolvedValueOnce();

    render(
      <RubricFormModal open={true} onClose={vi.fn()} onSave={onSave} />
    );

    const nameInput = screen.getByPlaceholderText(/Resolución de Problemas Complejos/i);
    fireEvent.change(nameInput, { target: { value: 'Rúbrica de Ensayo' } });

    const addCritBtn = screen.getByText('Añadir Criterio');
    fireEvent.click(addCritBtn);

    const submitBtn = screen.getByText('Crear Plantilla');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      const payload = onSave.mock.calls[0][0];
      expect(payload.name).toBe('Rúbrica de Ensayo');
      expect(payload.criteria.length).toBe(2);
    });
  });

  it('loads existing initialData when editing', () => {
    const initialData = {
      id: 5,
      name: 'Rúbrica Existente',
      description: 'Descripción previa',
      criteria: [
        {
          id: 1,
          sortorder: 1,
          description: 'Criterio Previo',
          levels: [
            { id: 10, score: 0, definition: 'Bajo' },
            { id: 20, score: 10, definition: 'Alto' },
          ],
        },
      ],
    };

    render(
      <RubricFormModal open={true} onClose={vi.fn()} onSave={vi.fn()} initialData={initialData} />
    );

    expect(screen.getByText('Editar Plantilla de Rúbrica')).toBeDefined();
    const nameInput = screen.getByPlaceholderText(/Resolución de Problemas Complejos/i);
    expect(nameInput.value).toBe('Rúbrica Existente');
  });
});
