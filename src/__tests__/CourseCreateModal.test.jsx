import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CourseCreateModal } from '../views/courses/CourseCreateModal';

const mockMutateAsync = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../hooks/useAdminerQueries', () => ({
  useCourseAction: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe('CourseCreateModal', () => {
  const categoriesList = [
    { id: 1, name: 'Ciencias Exactas', depth: 0 },
    { id: 2, name: 'Computación', depth: 1 },
  ];

  it('validates fields and submits new course', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <CourseCreateModal
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        categoriesList={categoriesList}
        defaultCategoryId={1}
      />
    );

    expect(screen.getByText('Crear Nuevo Curso')).toBeDefined();

    // Submit without typing anything to trigger errors
    fireEvent.click(screen.getByText('Crear Curso'));
    expect(screen.getByText('El nombre completo debe tener al menos 3 caracteres.')).toBeDefined();

    // Fill valid data
    fireEvent.change(screen.getByPlaceholderText('Ej: Introducción a Python 3'), {
      target: { value: 'Curso de Python Avanzado' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ej: PY3-101'), {
      target: { value: 'PY-ADV-201' },
    });

    mockMutateAsync.mockResolvedValue({ success: true });
    fireEvent.click(screen.getByText('Crear Curso'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          fullname: 'Curso de Python Avanzado',
          shortname: 'PY-ADV-201',
          categoryid: 1,
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
