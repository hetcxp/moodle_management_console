import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { ToastProvider } from '../components/ui/Toast';
import { LearningPathDetailView } from '../views/LearningPathDetailView';

const mockState = vi.fn();

vi.mock('../views/learning_paths/useLearningPathDetailState', () => ({
  useLearningPathDetailState: () => mockState(),
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

describe('LearningPathDetailView', () => {
  it('renders loading state', () => {
    mockState.mockReturnValue({
      loading: true,
      path: null,
      error: null,
      activeTab: 'structure',
    });

    renderWithProviders(<LearningPathDetailView id={1} />);
    expect(screen.getByText(/Cargando detalles de la ruta/i)).toBeDefined();
  });

  it('renders detail view with title and tabs when loaded', () => {
    mockState.mockReturnValue({
      loading: false,
      path: {
        id: 1,
        fullname: 'Ruta de Machine Learning',
        shortname: 'ML101',
        visible: 1,
        subcourse_count: 5,
        cohorts_count: 2,
        users_count: 50,
        sections: [],
        cohorts: [],
        users: [],
      },
      error: null,
      activeTab: 'structure',
      setActiveTab: vi.fn(),
      deleteConfirmOpen: false,
      setDeleteConfirmOpen: vi.fn(),
      isStructureDirty: false,
      setIsStructureDirty: vi.fn(),
      structureDraft: [],
      setStructureDraft: vi.fn(),
      savingStructure: false,
      enrolling: false,
      deleting: false,
      handleSaveStructure: vi.fn(),
      handleAssignCohorts: vi.fn(),
      handleRemoveCohort: vi.fn(),
      handleAssignUsers: vi.fn(),
      handleRemoveUser: vi.fn(),
      handleDeleteRequest: vi.fn(),
      handleConfirmDelete: vi.fn(),
      handleViewInMoodle: vi.fn(),
      refetch: vi.fn(),
    });

    const onBack = vi.fn();
    renderWithProviders(<LearningPathDetailView id={1} onBack={onBack} />);

    expect(screen.getAllByText('Ruta de Machine Learning').length).toBeGreaterThan(0);
    expect(screen.getByText('ML101')).toBeDefined();

    const backBtn = screen.getByText('Rutas de Aprendizaje');
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});
