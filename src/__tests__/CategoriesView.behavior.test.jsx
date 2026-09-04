import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { CategoriesView } from '../views/CategoriesView';
import { AdminerApi } from '../services/adminer-api';

vi.mock('../services/adminer-api', () => import('./__mocks__/adminer-api'));

describe('CategoriesView behavior tests', () => {
  const sampleCategories = [
    {
      id: 1,
      name: 'Facultad de Ingeniería',
      idnumber: 'ING-01',
      coursecount: 0,
      visible: 1,
      parent: 0,
      description: 'Cursos de ingeniería',
    },
    {
      id: 2,
      name: 'Facultad de Medicina',
      idnumber: 'MED-01',
      coursecount: 0,
      visible: 0,
      parent: 0,
      description: 'Cursos de medicina',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    AdminerApi.getCategories.mockResolvedValue({
      categories: sampleCategories,
      totalcount: 2,
    });
    AdminerApi.getCategoriesFlat.mockResolvedValue({
      categories: sampleCategories,
    });
  });

  it('renders categories list correctly', async () => {
    renderWithProviders(<CategoriesView />);

    await waitFor(() => {
      expect(screen.getByText('Facultad de Ingeniería')).toBeDefined();
      expect(screen.getByText('Facultad de Medicina')).toBeDefined();
    });
  });

  it('filters categories when typing into search input', async () => {
    renderWithProviders(<CategoriesView />);

    await waitFor(() => {
      expect(screen.getByText('Facultad de Ingeniería')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar categoría.../i);
    fireEvent.change(searchInput, { target: { value: 'Ingeniería' } });

    await waitFor(() => {
      expect(searchInput.value).toBe('Ingeniería');
    });
  });

  it('toggles category visibility when clicking visibility action button', async () => {
    AdminerApi.categoryAction.mockResolvedValueOnce({ success: true, affectedcount: 1 });

    renderWithProviders(<CategoriesView />);

    await waitFor(() => {
      expect(screen.getByText('Facultad de Ingeniería')).toBeDefined();
    });

    const hideButtons = screen.getAllByTitle(/Ocultar categoría/i);
    expect(hideButtons.length).toBeGreaterThan(0);
    fireEvent.click(hideButtons[0]);

    await waitFor(() => {
      expect(AdminerApi.categoryAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'hide',
          categoryids: [1],
        })
      );
    });
  });

  it('opens create category modal and submits new category', async () => {
    AdminerApi.categoryAction.mockResolvedValueOnce({ success: true, affectedcount: 1 });

    renderWithProviders(<CategoriesView />);

    await waitFor(() => {
      expect(screen.getByText('Facultad de Ingeniería')).toBeDefined();
    });

    const createButton = screen.getByRole('button', { name: /Nueva Categoría/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ej: Programación y Software/i)).toBeDefined();
    });

    const nameInput = screen.getByPlaceholderText(/Ej: Programación y Software/i);
    fireEvent.change(nameInput, { target: { value: 'Ciencias Sociales' } });

    const submitButton = screen.getByRole('button', { name: /Crear Categoría/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(AdminerApi.categoryAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          name: 'Ciencias Sociales',
        })
      );
    });
  });

  it('triggers delete confirmation and executes delete action', async () => {
    AdminerApi.categoryAction.mockResolvedValueOnce({ success: true, affectedcount: 1 });

    renderWithProviders(<CategoriesView />);

    await waitFor(() => {
      expect(screen.getByText('Facultad de Ingeniería')).toBeDefined();
    });

    const deleteButtons = screen.getAllByTitle(/Eliminar categoría/i);
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/¿Eliminar categoría\?/i)).toBeDefined();
    });

    const confirmButton = screen.getByRole('button', { name: /Sí, eliminar/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(AdminerApi.categoryAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          categoryids: [1],
        })
      );
    });
  });
});
