import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpProvider, useHelp, resolveViewId } from '../context/HelpContext';

const TestConsumer = () => {
  const { isOpen, viewId, openHelp, closeHelp, toggleHelp } = useHelp();
  return (
    <div>
      <button id="help-button" onClick={() => toggleHelp()}>Toggle Help</button>
      <button onClick={() => openHelp('courses')}>Open Courses Help</button>
      <button onClick={() => closeHelp()}>Close Help</button>
      <input id="test-input" placeholder="Type here" />
      <span data-testid="status">{isOpen ? 'OPEN' : 'CLOSED'}</span>
      <span data-testid="view-id">{viewId}</span>
    </div>
  );
};

describe('HelpContext', () => {
  const originalConfig = window.MANAGEMENT_CONSOLE_CONFIG;

  beforeEach(() => {
    delete window.MANAGEMENT_CONSOLE_CONFIG;
  });

  afterEach(() => {
    window.MANAGEMENT_CONSOLE_CONFIG = originalConfig;
  });

  it('toggleHelp cambia isOpen y closeHelp lo cierra', () => {
    render(
      <HelpProvider>
        <TestConsumer />
      </HelpProvider>
    );

    expect(screen.getByTestId('status').textContent).toBe('CLOSED');
    fireEvent.click(screen.getByText('Toggle Help'));
    expect(screen.getByTestId('status').textContent).toBe('OPEN');
    fireEvent.click(screen.getByText('Close Help'));
    expect(screen.getByTestId('status').textContent).toBe('CLOSED');
  });

  it('tecla ? fuera de un input abre el drawer', () => {
    render(
      <HelpProvider>
        <TestConsumer />
      </HelpProvider>
    );

    expect(screen.getByTestId('status').textContent).toBe('CLOSED');
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByTestId('status').textContent).toBe('OPEN');
  });

  it('tecla ? dentro de un input NO abre el drawer', () => {
    render(
      <HelpProvider>
        <TestConsumer />
      </HelpProvider>
    );

    const input = screen.getByPlaceholderText('Type here');
    input.focus();

    fireEvent.keyDown(input, { key: '?' });
    expect(screen.getByTestId('status').textContent).toBe('CLOSED');
  });

  it('en modo embebido no registra listener de teclado ?', () => {
    window.MANAGEMENT_CONSOLE_CONFIG = { embedded: true };

    render(
      <HelpProvider>
        <TestConsumer />
      </HelpProvider>
    );

    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByTestId('status').textContent).toBe('CLOSED');

    // Pero vía botón sí funciona
    fireEvent.click(screen.getByText('Toggle Help'));
    expect(screen.getByTestId('status').textContent).toBe('OPEN');
  });

  it('tecla Escape cierra el drawer y restaura foco a #help-button', () => {
    render(
      <HelpProvider>
        <TestConsumer />
      </HelpProvider>
    );

    const helpBtn = screen.getByRole('button', { name: 'Toggle Help' });
    fireEvent.click(helpBtn);
    expect(screen.getByTestId('status').textContent).toBe('OPEN');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('status').textContent).toBe('CLOSED');
    expect(document.activeElement).toBe(helpBtn);
  });

  it('resolveViewId mapea correctamente /courses/:courseId/users/:userId a course-user-detail', () => {
    expect(resolveViewId('/courses/3/users/1')).toBe('course-user-detail');
    expect(resolveViewId('/courses/102/users/55')).toBe('course-user-detail');
    expect(resolveViewId('/courses/102')).toBe('courses-detail');
    expect(resolveViewId('/courses')).toBe('courses');
    expect(resolveViewId('/users/55')).toBe('users-detail');
    expect(resolveViewId('/competencies/scales')).toBe('scales');
    expect(resolveViewId('/competencies/rubrics')).toBe('rubrics');
    expect(resolveViewId('/competencies/12')).toBe('competency-framework-detail');
    expect(resolveViewId('/competencies')).toBe('competencies');
  });
});
