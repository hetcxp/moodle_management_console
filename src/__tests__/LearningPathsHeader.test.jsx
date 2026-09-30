import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LearningPathsHeader } from '../views/learning_paths/LearningPathsHeader';

describe('LearningPathsHeader', () => {
  it('renders title, badge and default KPIs', () => {
    render(
      <LearningPathsHeader
        totalCount={5}
        loading={false}
        search=""
        onSearchChange={vi.fn()}
        onRefresh={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(screen.getByText('Rutas de Aprendizaje')).toBeDefined();
    expect(screen.getByText('5 rutas')).toBeDefined();
    expect(screen.getByText('Total Rutas')).toBeDefined();
    expect(screen.getByText('Visibles')).toBeDefined();
    expect(screen.getByText('Ocultas')).toBeDefined();
    expect(screen.getByText('Subcursos Promedio')).toBeDefined();
  });

  it('renders single count singular form', () => {
    render(
      <LearningPathsHeader
        totalCount={1}
        loading={false}
        search=""
        onSearchChange={vi.fn()}
      />
    );
    expect(screen.getByText('1 ruta')).toBeDefined();
  });

  it('handles search input and create action callback', async () => {
    const onSearchChange = vi.fn();
    const onCreate = vi.fn();

    render(
      <LearningPathsHeader
        totalCount={3}
        loading={false}
        search="test search"
        onSearchChange={onSearchChange}
        onCreate={onCreate}
        hasCreatePerm={true}
      />
    );

    const input = screen.getByPlaceholderText('Buscar por nombre o código de ruta...');
    expect(input.value).toBe('test search');

    fireEvent.change(input, { target: { value: 'nueva búsqueda' } });
    await waitFor(() => {
      expect(onSearchChange).toHaveBeenCalledWith('nueva búsqueda');
    });

    const createBtn = screen.getByText('Nueva Ruta');
    fireEvent.click(createBtn);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('hides create button when hasCreatePerm is false', () => {
    render(
      <LearningPathsHeader
        totalCount={0}
        loading={false}
        search=""
        hasCreatePerm={false}
      />
    );

    expect(screen.queryByText('Nueva Ruta')).toBeNull();
  });
});
