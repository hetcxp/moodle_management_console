import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseCohortsTab } from '../views/courses/CourseCohortsTab';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ permissions: { is_siteadmin: 1 } }),
}));

vi.mock('../hooks/usePermission', () => ({
  usePermission: () => true,
  usePermissionsHelper: () => ({ has: () => true }),
}));

describe('CourseCohortsTab', () => {
  const mockCohorts = [
    { id: 1, name: 'Cohorte Alfa', idnumber: 'ALF-01', members_count: 15, status: 'active' },
  ];

  it('renders cohort table and actions', () => {
    const onOpenSelector = vi.fn();
    render(
      <CourseCohortsTab
        cohorts={mockCohorts}
        users={[]}
        coursegroups={[]}
        handleCohortAction={vi.fn()}
        onOpenSelector={onOpenSelector}
        onNavigateToDetail={vi.fn()}
        courseId={10}
      />
    );

    expect(screen.getByText('Cohorte Alfa')).toBeDefined();
    expect(screen.getByText('ALF-01')).toBeDefined();

    const addBtn = screen.getByText(/Vincular Cohorte/i);
    fireEvent.click(addBtn);
    expect(onOpenSelector).toHaveBeenCalled();
  });
});
