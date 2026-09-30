import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { ToastProvider } from '../components/ui/Toast';
import { LearningPathsView } from '../views/LearningPathsView';

const mockUseLearningPathsState = vi.fn();

vi.mock('../views/learning_paths/useLearningPathsState', () => ({
  useLearningPathsState: () => mockUseLearningPathsState(),
}));

const renderWithProviders = (ui) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe('LearningPathsView', () => {
  it('renders DependencyGuardCard when dependencies are missing', () => {
    mockUseLearningPathsState.mockReturnValue({
      dependencies: { missing: ['local_subcourseenrol'] },
    });

    renderWithProviders(<LearningPathsView onNavigateToDetail={vi.fn()} />);
    expect(screen.getByText(/Dependencias de Moodle requeridas/i)).toBeDefined();
  });

  it('renders header and table when dependencies are met', () => {
    const setCreateModalOpen = vi.fn();
    const refetch = vi.fn();
    const onNavigateToDetail = vi.fn();

    mockUseLearningPathsState.mockReturnValue({
      paths: [
        { id: 1, fullname: 'Ruta Fullstack', shortname: 'FS101', visible: 1, subcourse_count: 3 },
      ],
      totalCount: 1,
      loading: false,
      page: 0,
      perPage: 20,
      search: '',
      kpis: [],
      dependencies: { missing: [] },
      hasCreatePerm: true,
      createModalOpen: false,
      deleteConfirmOpen: false,
      pathToDelete: null,
      deleteLoading: false,
      setPage: vi.fn(),
      setSearch: vi.fn(),
      setCreateModalOpen,
      setDeleteConfirmOpen: vi.fn(),
      refetch,
      handleDeleteRequest: vi.fn(),
      handleConfirmDelete: vi.fn(),
      handleViewInMoodle: vi.fn(),
    });

    renderWithProviders(<LearningPathsView onNavigateToDetail={onNavigateToDetail} />);

    expect(screen.getByText('Rutas de Aprendizaje')).toBeDefined();
    expect(screen.getByText('Ruta Fullstack')).toBeDefined();

    const createBtn = screen.getByText('Nueva Ruta');
    fireEvent.click(createBtn);
    expect(setCreateModalOpen).toHaveBeenCalledWith(true);
  });
});
