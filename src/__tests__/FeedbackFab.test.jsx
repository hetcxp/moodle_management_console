import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackFab } from '../components/feedback/FeedbackFab';
import { FeedbackModal } from '../components/feedback/FeedbackModal';
import { ToastProvider } from '../components/ui/Toast';
import { FeedbackApi } from '../services/api/feedback-api';

vi.mock('../services/api/feedback-api', () => ({
  FeedbackApi: {
    submitFeedback: vi.fn().mockResolvedValue({ success: true, feedbackid: 42, message: 'Reporte enviado' }),
    getMyFeedback: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getFeedbackTickets: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    updateFeedbackStatus: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v39gwAA'),
  }),
}));

describe('FeedbackFab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.MANAGEMENT_CONSOLE_CONFIG;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders floating action button by default with correct size and z-index', () => {
    const { container } = render(
      <ToastProvider>
        <FeedbackFab />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /reportar problema o sugerencia/i });
    expect(button).toBeDefined();
    expect(button.className).toContain('h-14');
    expect(button.className).toContain('w-14');

    const wrapper = container.querySelector('.feedback-fab-container');
    expect(wrapper).toBeDefined();
    expect(wrapper.className).toContain('z-[10000]');
  });

  it('does not render when feedbackEnabled is false in config', () => {
    window.MANAGEMENT_CONSOLE_CONFIG = {
      feedbackEnabled: false,
    };

    render(
      <ToastProvider>
        <FeedbackFab />
      </ToastProvider>
    );

    const button = screen.queryByRole('button', { name: /reportar problema o sugerencia/i });
    expect(button).toBeNull();
  });

  it('triggers capture and opens FeedbackModal on click', async () => {
    render(
      <ToastProvider>
        <FeedbackFab />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /reportar problema o sugerencia/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText(/enviar reporte o sugerencia/i)).toBeDefined();
    });
  });
});

describe('FeedbackModal Component', () => {
  it('submits feedback report with description and type', async () => {
    const handleClose = vi.fn();
    render(
      <ToastProvider>
        <FeedbackModal
          open={true}
          onClose={handleClose}
          initialScreenshot="data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v39gwAA"
        />
      </ToastProvider>
    );

    // Select 'Error Técnico'
    const errorBtn = screen.getByRole('button', { name: /error técnico/i });
    fireEvent.click(errorBtn);

    // Write description
    const textarea = screen.getByPlaceholderText(/explica qué ocurrió/i);
    fireEvent.change(textarea, { target: { value: 'Hubo un error 500 al guardar el curso.' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /enviar reporte/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(FeedbackApi.submitFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Hubo un error 500 al guardar el curso.',
        })
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('allows removing screenshot before submit', async () => {
    render(
      <ToastProvider>
        <FeedbackModal
          open={true}
          onClose={vi.fn()}
          initialScreenshot="data:image/webp;base64,mocked"
        />
      </ToastProvider>
    );

    expect(screen.getByText(/captura del viewport/i)).toBeDefined();
    const removeBtn = screen.getByRole('button', { name: /remover captura/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByText(/captura del viewport/i)).toBeNull();
  });

  it('renders dialog in portal with z-[10010] and object-contain image preview', () => {
    render(
      <ToastProvider>
        <FeedbackModal
          open={true}
          onClose={vi.fn()}
          initialScreenshot="data:image/webp;base64,mockedpreview"
        />
      </ToastProvider>
    );

    const dialog = screen.getByRole('dialog', { name: /enviar reporte o sugerencia/i });
    expect(dialog).toBeDefined();
    expect(dialog.className).toContain('z-[10010]');

    const img = screen.getByAltText(/captura de pantalla previa/i);
    expect(img).toBeDefined();
    expect(img.className).toContain('object-contain');
  });
});
