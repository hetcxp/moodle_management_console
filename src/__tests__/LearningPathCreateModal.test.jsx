import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LearningPathCreateModal } from '../views/learning_paths/LearningPathCreateModal';

const mutateAsyncMock = vi.fn();

vi.mock('../hooks/useAdminerQueries', () => ({
  useCreateLearningPath: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

describe('LearningPathCreateModal', () => {
  it('renders modal dialog when open is true', () => {
    render(<LearningPathCreateModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByText('Crear Nueva Ruta de Aprendizaje')).toBeDefined();
  });

  it('validates required fields before submitting', async () => {
    render(<LearningPathCreateModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const submitBtn = screen.getByText('Crear Ruta');
    fireEvent.click(submitBtn);

    expect(screen.getByText(/El nombre completo y el nombre corto son obligatorios/i)).toBeDefined();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('submits form with valid data and invokes onSuccess', async () => {
    mutateAsyncMock.mockResolvedValueOnce({ id: 101, fullname: 'Ruta Dev' });
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(<LearningPathCreateModal open={true} onClose={onClose} onSuccess={onSuccess} />);

    const nameInput = screen.getByPlaceholderText(/Frontend 2026/i);
    const codeInput = screen.getByPlaceholderText(/RUTA-FRONT-2026/i);

    fireEvent.change(nameInput, { target: { value: 'Ruta Dev' } });
    fireEvent.change(codeInput, { target: { value: 'DEV101' } });

    const submitBtn = screen.getByText('Crear Ruta');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        fullname: 'Ruta Dev',
        shortname: 'DEV101',
        startdate: 0,
      });
      expect(onSuccess).toHaveBeenCalledWith({ id: 101, fullname: 'Ruta Dev' });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
