import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpTooltip } from '../components/ui/HelpTooltip';

describe('HelpTooltip', () => {
  it('renderiza el botón con icono y oculta el tooltip inicialmente', () => {
    render(<HelpTooltip text="Explicación detallada del indicador" />);

    const button = screen.getByRole('button', { name: 'Más información' });
    expect(button).toBeDefined();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('muestra el tooltip en mouseEnter y lo oculta en mouseLeave', () => {
    render(<HelpTooltip text="Explicación detallada del indicador" />);

    const button = screen.getByRole('button', { name: 'Más información' });
    const container = button.parentElement;

    fireEvent.mouseEnter(container);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toBe('Explicación detallada del indicador');

    fireEvent.mouseLeave(container);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('cierra el tooltip al presionar la tecla Escape', () => {
    render(<HelpTooltip text="Explicación detallada del indicador" />);

    const button = screen.getByRole('button', { name: 'Más información' });
    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
