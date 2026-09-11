import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider, useTheme, THEMES } from '../context/ThemeContext';

const TestComponent = () => {
  const { theme, setTheme, toggleTheme, isDark, themes } = useTheme();

  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="is-dark">{isDark ? 'true' : 'false'}</span>
      <span data-testid="themes-count">{themes.length}</span>
      <button onClick={() => setTheme('gold-teal')} data-testid="set-gold-teal">
        Set Gold & Teal
      </button>
      <button onClick={() => setTheme('mint-fresh')} data-testid="set-mint-fresh">
        Set Mint Fresh
      </button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Set Dark
      </button>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Set Light
      </button>
      <button onClick={toggleTheme} data-testid="toggle-theme">
        Cycle Theme
      </button>
    </div>
  );
};

describe('ThemeContext & ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('provides the 4 expected themes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('themes-count').textContent).toBe('4');
    const ids = THEMES.map(t => t.id);
    expect(ids).toContain('light');
    expect(ids).toContain('dark');
    expect(ids).toContain('gold-teal');
    expect(ids).toContain('mint-fresh');
  });

  it('defaults to light theme when localStorage is empty', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(screen.getByTestId('is-dark').textContent).toBe('false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('switches to gold-teal, applies dark class, data-theme, and theme-gold-teal class', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-gold-teal').click();
    });

    expect(screen.getByTestId('current-theme').textContent).toBe('gold-teal');
    expect(screen.getByTestId('is-dark').textContent).toBe('true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('gold-teal');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-gold-teal')).toBe(true);
    expect(document.documentElement.classList.contains('theme-mint-fresh')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('gold-teal');
  });

  it('switches to mint-fresh, removes dark class and applies theme-mint-fresh', () => {
    render(
      <ThemeProvider initialTheme="dark">
        <TestComponent />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-mint-fresh').click();
    });

    expect(screen.getByTestId('current-theme').textContent).toBe('mint-fresh');
    expect(screen.getByTestId('is-dark').textContent).toBe('false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('mint-fresh');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('theme-mint-fresh')).toBe(true);
    expect(document.documentElement.classList.contains('theme-gold-teal')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('mint-fresh');
  });

  it('cycles through all themes sequentially with toggleTheme', () => {
    render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId('toggle-theme');

    // light -> dark
    act(() => {
      toggleBtn.click();
    });
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');

    // dark -> gold-teal
    act(() => {
      toggleBtn.click();
    });
    expect(screen.getByTestId('current-theme').textContent).toBe('gold-teal');

    // gold-teal -> mint-fresh
    act(() => {
      toggleBtn.click();
    });
    expect(screen.getByTestId('current-theme').textContent).toBe('mint-fresh');

    // mint-fresh -> light
    act(() => {
      toggleBtn.click();
    });
    expect(screen.getByTestId('current-theme').textContent).toBe('light');
  });
});
