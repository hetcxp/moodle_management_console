import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotFoundView } from '../views/NotFoundView';

describe('NotFoundView', () => {
  it('renders 404 message and handles navigate home action', () => {
    const onNavigateHome = vi.fn();
    render(<NotFoundView onNavigateHome={onNavigateHome} />);

    expect(screen.getByText('404')).toBeDefined();
    expect(screen.getByText('Página no encontrada')).toBeDefined();

    const homeButton = screen.getByText('Volver al Inicio');
    fireEvent.click(homeButton);
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });
});
