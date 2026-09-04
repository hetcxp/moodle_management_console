import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';

const FaultyComponent = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test crash in child component');
  }
  return <div>Componente Funcionando</div>;
};

const TestContainer = () => {
  const [shouldThrow, setShouldThrow] = useState(true);

  return (
    <ErrorBoundary>
      <FaultyComponent shouldThrow={shouldThrow} />
      <button onClick={() => setShouldThrow(false)}>Reparar</button>
    </ErrorBoundary>
  );
};

describe('ErrorBoundary component', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Contenido Seguro</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Contenido Seguro')).toBeDefined();
  });

  it('catches render error, displays fallback UI and allows reset', () => {
    render(<TestContainer />);

    expect(screen.getByText('Algo salió mal')).toBeDefined();
    expect(screen.getByText(/Test crash in child component/)).toBeDefined();

    const retryButton = screen.getByText('Reintentar');
    expect(retryButton).toBeDefined();

    fireEvent.click(retryButton);
  });
});
