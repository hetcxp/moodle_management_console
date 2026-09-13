import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpProvider, useHelp } from '../context/HelpContext';
import { HelpDrawer } from '../components/ui/HelpDrawer';

const MockAppWithDrawer = ({ initialViewId = 'courses' }) => {
  const { openHelp } = useHelp();
  return (
    <div>
      <button id="help-button" onClick={() => openHelp(initialViewId)}>Open Help</button>
      <HelpDrawer />
    </div>
  );
};

describe('HelpDrawer', () => {
  it('se monta en document.body y muestra el título correspondiente al viewId', () => {
    render(
      <HelpProvider>
        <MockAppWithDrawer initialViewId="courses" />
      </HelpProvider>
    );

    // Abre el drawer
    fireEvent.click(screen.getByText('Open Help'));

    const drawerTitle = screen.getByText('Gestión de Cursos');
    expect(drawerTitle).toBeDefined();
    expect(drawerTitle.closest('aside')).toBeDefined();
    // Verifica que el aside está montado directamente bajo un portal en document.body
    expect(document.body.contains(drawerTitle)).toBe(true);
  });

  it('no expone términos técnicos crudos tipo moodle/ en roles de acciones', () => {
    render(
      <HelpProvider>
        <MockAppWithDrawer initialViewId="dashboard" />
      </HelpProvider>
    );

    fireEvent.click(screen.getByText('Open Help'));
    const aside = screen.getByRole('dialog', { hidden: true }) || screen.getByRole('dialog');
    expect(aside.innerHTML).not.toContain('moodle/');
  });

  it('permite cerrar haciendo click en el botón de cerrar', () => {
    render(
      <HelpProvider>
        <MockAppWithDrawer initialViewId="courses" />
      </HelpProvider>
    );

    fireEvent.click(screen.getByText('Open Help'));
    const closeBtn = screen.getByRole('button', { name: 'Cerrar ayuda' });
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn);

    // El aside se oculta con translate-x-full
    const aside = screen.getByRole('dialog', { hidden: true });
    expect(aside.className).toContain('translate-x-full');
  });

  it('renderiza métricas y acciones en bloques colapsables (details/summary)', () => {
    render(
      <HelpProvider>
        <MockAppWithDrawer initialViewId="dashboard" />
      </HelpProvider>
    );

    fireEvent.click(screen.getByText('Open Help'));
    const aside = screen.getByRole('dialog', { hidden: true }) || screen.getByRole('dialog');

    // Verifica que existan elementos details y summary
    const detailsElements = aside.querySelectorAll('details');
    expect(detailsElements.length).toBeGreaterThan(0);

    const summaries = aside.querySelectorAll('details summary');
    const summaryTexts = Array.from(summaries).map(s => s.textContent);

    // Debe contener títulos de KPIs y de acciones como resúmenes colapsables
    expect(summaryTexts.some(t => t.includes('Cursos'))).toBe(true);
    expect(summaryTexts.some(t => t.includes('Actualizar Métricas'))).toBe(true);
  });

  it('muestra la ayuda específica de usuario en curso para course-user-detail', () => {
    render(
      <HelpProvider>
        <MockAppWithDrawer initialViewId="course-user-detail" />
      </HelpProvider>
    );

    fireEvent.click(screen.getByText('Open Help'));
    expect(screen.getByText('Usuario en Curso')).toBeDefined();

    const aside = screen.getByRole('dialog', { hidden: true }) || screen.getByRole('dialog');
    const summaries = aside.querySelectorAll('details summary');
    const summaryTexts = Array.from(summaries).map(s => s.textContent);

    expect(summaryTexts.some(t => t.includes('Mensaje'))).toBe(true);
    expect(summaryTexts.some(t => t.includes('Expiración'))).toBe(true);
    expect(summaryTexts.some(t => t.includes('Suspender / Activar'))).toBe(true);
    expect(summaryTexts.some(t => t.includes('Desmatricular'))).toBe(true);
  });
});
