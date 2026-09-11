import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeSelector } from '../components/ThemeSelector';
import { ThemeProvider } from '../context/ThemeContext';

describe('ThemeSelector component', () => {
  it('renders closed by default with proper ARIA attributes', () => {
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-haspopup')).toBe('listbox');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens popover when clicking button and lists all 4 themes', () => {
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(button.getAttribute('aria-expanded')).toBe('true');
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeDefined();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(screen.getByText('Gold & Teal')).toBeDefined();
    expect(screen.getByText('Mint Fresh')).toBeDefined();
    expect(screen.getByText('Claro')).toBeDefined();
    expect(screen.getByText('Oscuro')).toBeDefined();
  });

  it('selects a theme when clicked and closes popover', () => {
    const onSelectMock = vi.fn();
    render(
      <ThemeSelector
        currentTheme="light"
        onSelectTheme={onSelectMock}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const goldTealOption = screen.getByText('Gold & Teal').closest('button');
    fireEvent.click(goldTealOption);

    expect(onSelectMock).toHaveBeenCalledWith('gold-teal');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes popover on Escape key press', () => {
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByRole('listbox')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
