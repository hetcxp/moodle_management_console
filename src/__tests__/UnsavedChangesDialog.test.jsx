import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnsavedChangesDialog } from '../views/learning_paths/UnsavedChangesDialog';

describe('UnsavedChangesDialog', () => {
  it('renders dialog options and handles callbacks', () => {
    const onStay = vi.fn();
    const onDiscard = vi.fn();
    const onSaveAndContinue = vi.fn();

    render(
      <UnsavedChangesDialog
        open={true}
        onStay={onStay}
        onDiscard={onDiscard}
        onSaveAndContinue={onSaveAndContinue}
      />
    );

    expect(screen.getByText('Cambios sin guardar en la estructura')).toBeDefined();

    const stayBtn = screen.getByText('Permanecer aquí');
    fireEvent.click(stayBtn);
    expect(onStay).toHaveBeenCalledTimes(1);

    const discardBtn = screen.getByText('Descartar y salir');
    fireEvent.click(discardBtn);
    expect(onDiscard).toHaveBeenCalledTimes(1);

    const saveBtn = screen.getByText('Guardar y continuar');
    fireEvent.click(saveBtn);
    expect(onSaveAndContinue).toHaveBeenCalledTimes(1);
  });
});
