import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActionsCard } from '../views/dashboard/QuickActionsCard';
import { RecentUsersCard, RecentCoursesCard } from '../views/dashboard/RecentActivityCards';

describe('Dashboard Cards', () => {
  it('renders QuickActionsCard and triggers navigation', () => {
    const onNavigate = vi.fn();
    render(<QuickActionsCard onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Gestionar Cursos'));
    expect(onNavigate).toHaveBeenCalledWith('courses');

    fireEvent.click(screen.getByText('Gestionar Usuarios'));
    expect(onNavigate).toHaveBeenCalledWith('users');

    fireEvent.click(screen.getByText('Categorías'));
    expect(onNavigate).toHaveBeenCalledWith('categories');
  });

  it('renders RecentUsersCard with data and loading states', () => {
    const onNavigate = vi.fn();
    const onNavigateToDetail = vi.fn();

    const { rerender } = render(
      <RecentUsersCard
        loading={true}
        recentUsers={[]}
        onNavigate={onNavigate}
        onNavigateToDetail={onNavigateToDetail}
      />
    );

    rerender(
      <RecentUsersCard
        loading={false}
        recentUsers={[
          { id: 1, firstname: 'Juan', lastname: 'Perez', fullname: 'Juan Perez', email: 'juan@example.com', lastaccess: 1700000000 },
        ]}
        onNavigate={onNavigate}
        onNavigateToDetail={onNavigateToDetail}
      />
    );

    expect(screen.getByText('Juan Perez')).toBeDefined();
    fireEvent.click(screen.getByText('Juan Perez'));
    expect(onNavigateToDetail).toHaveBeenCalledWith('user', 1);

    fireEvent.click(screen.getByText('Ver todos'));
    expect(onNavigate).toHaveBeenCalledWith('users');
  });

  it('renders RecentCoursesCard with data and triggers detail', () => {
    const onNavigate = vi.fn();
    const onNavigateToDetail = vi.fn();

    render(
      <RecentCoursesCard
        loading={false}
        recentCourses={[
          { id: 10, fullname: 'Biología Celular', shortname: 'BIO101', enrolled_count: 30 },
        ]}
        onNavigate={onNavigate}
        onNavigateToDetail={onNavigateToDetail}
      />
    );

    expect(screen.getByText('Biología Celular')).toBeDefined();
    fireEvent.click(screen.getByText('Biología Celular'));
    expect(onNavigateToDetail).toHaveBeenCalledWith('course', 10);

    fireEvent.click(screen.getByText('Ver todos'));
    expect(onNavigate).toHaveBeenCalledWith('courses');
  });
});
