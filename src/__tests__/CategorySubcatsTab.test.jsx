import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../components/ui/Toast';
import { CategorySubcatsTab } from '../views/categories/CategorySubcatsTab';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ permissions: { is_siteadmin: 1 } }),
}));

vi.mock('../hooks/usePermission', () => ({
  usePermission: () => true,
  usePermissionsHelper: () => ({ has: () => true }),
}));

vi.mock('../hooks/useAdminerQueries', () => ({
  useCategoryAction: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}));

describe('CategorySubcatsTab', () => {
  const mockSubcategories = [
    { id: 10, name: 'Subcategoría A', description: 'Desc A', coursecount: 4, visible: 1 },
    { id: 20, name: 'Subcategoría B', description: 'Desc B', coursecount: 0, visible: 0 },
  ];

  it('renders subcategories list and filter controls', () => {
    render(
      <ToastProvider>
        <CategorySubcatsTab
          subcategories={mockSubcategories}
          categoryId={1}
          loading={false}
          hasManageCategory={true}
          loadData={vi.fn()}
          handleBulkSubcategoryAction={vi.fn()}
          handleToggleCategoryVisibility={vi.fn()}
          onNavigateToDetail={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByText('Subcategoría A')).toBeDefined();
    expect(screen.getByText('Subcategoría B')).toBeDefined();
    expect(screen.getByText('Nueva Subcategoría')).toBeDefined();
  });

  it('opens create modal on button click', () => {
    render(
      <ToastProvider>
        <CategorySubcatsTab
          subcategories={mockSubcategories}
          categoryId={1}
          loading={false}
          hasManageCategory={true}
          loadData={vi.fn()}
          handleBulkSubcategoryAction={vi.fn()}
          handleToggleCategoryVisibility={vi.fn()}
          onNavigateToDetail={vi.fn()}
        />
      </ToastProvider>
    );

    const createBtn = screen.getByText('Nueva Subcategoría');
    fireEvent.click(createBtn);

    expect(screen.getByText('Crear Subcategoría')).toBeDefined();
  });
});
