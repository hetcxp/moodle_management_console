import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTableToolbar } from '../components/datatable/DataTableToolbar';
import * as AuthContextModule from '../context/AuthContext';

describe('DataTableToolbar', () => {
  it('does not render if no items selected', () => {
    const { container } = render(<DataTableToolbar selectedIds={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correct count of selected items', () => {
    render(<DataTableToolbar selectedIds={[1, 2, 3]} />);
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('elementos seleccionados')).toBeDefined();
  });

  it('calls onSelectionChange with empty array on clear all', () => {
    const onSelectionChange = vi.fn();
    render(<DataTableToolbar selectedIds={[1, 2]} onSelectionChange={onSelectionChange} />);
    
    const clearBtn = screen.getByRole('button', { name: /Deseleccionar todos/i });
    fireEvent.click(clearBtn);
    
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('renders bulk actions and triggers onClick', () => {
    const actionSpy = vi.fn();
    const actions = [
      { label: 'Borrar', icon: <span data-testid="icon">x</span>, onClick: actionSpy }
    ];
    
    render(<DataTableToolbar selectedIds={[10, 20]} bulkActions={actions} />);
    
    const actionBtn = screen.getByRole('button', { name: /Borrar/i });
    expect(actionBtn).toBeDefined();
    
    fireEvent.click(actionBtn);
    expect(actionSpy).toHaveBeenCalledWith([10, 20]);
  });

  it('renders disabled bulk action and prevents onClick when disabled', () => {
    const actionSpy = vi.fn();
    const actions = [
      { label: 'Borrar', icon: <span data-testid="icon">x</span>, onClick: actionSpy, disabled: true, title: 'No permitido' }
    ];

    render(<DataTableToolbar selectedIds={[10, 20]} bulkActions={actions} />);

    const actionBtn = screen.getByRole('button', { name: /Borrar/i });
    expect(actionBtn.getAttribute('disabled')).not.toBeNull();
    expect(actionBtn.getAttribute('title')).toBe('No permitido');

    fireEvent.click(actionBtn);
    expect(actionSpy).not.toHaveBeenCalled();
  });

  it('automatically disables bulk actions when unlicensed in AuthContext', () => {
    const actionSpy = vi.fn();
    const actions = [
      { label: 'Suspender', icon: <span>x</span>, onClick: actionSpy }
    ];

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isLicensed: false,
      permissions: { is_siteadmin: 1 },
    });

    render(<DataTableToolbar selectedIds={[10, 20]} bulkActions={actions} />);

    const actionBtn = screen.getByRole('button', { name: /Suspender/i });
    expect(actionBtn.getAttribute('disabled')).not.toBeNull();
    expect(actionBtn.getAttribute('aria-disabled')).toBe('true');
    expect(actionBtn.getAttribute('title')).toContain('requiere activación de licencia');

    fireEvent.click(actionBtn);
    expect(actionSpy).not.toHaveBeenCalled();
  });
});
