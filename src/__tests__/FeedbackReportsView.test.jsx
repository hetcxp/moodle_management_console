import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { FeedbackReportsView } from '../views/FeedbackReportsView';
import { FeedbackApi } from '../services/api/feedback-api';

vi.mock('../services/api/feedback-api', () => ({
  FeedbackApi: {
    getMyFeedback: vi.fn(),
    getFeedbackTickets: vi.fn(),
    updateFeedbackStatus: vi.fn(),
  },
}));

describe('FeedbackReportsView', () => {
  const mockTickets = [
    {
      id: 10,
      userid: 2,
      type: 'issue',
      description: 'Error al sincronizar curso',
      pageurl: '/app/courses',
      useragent: 'Mozilla/5.0 Test',
      resolution: '1920x1080',
      status: 'new',
      admincomment: null,
      timecreated: 1730000000,
      userfullname: 'Admin User',
      screenshoturl: 'http://localhost:8000/webservice/pluginfile.php/1/tool_management_console/feedback_screenshot/10/screenshot_10.webp',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    FeedbackApi.getMyFeedback.mockResolvedValue({ items: mockTickets, total: 1 });
    FeedbackApi.getFeedbackTickets.mockResolvedValue({ items: mockTickets, total: 1 });
  });

  it('renders tickets list with Captura button', async () => {
    renderWithProviders(<FeedbackReportsView />, {
      authValue: { token: 'valid-test-token-123' },
    });

    await waitFor(() => {
      expect(screen.getByText('Error al sincronizar curso')).toBeDefined();
    });

    const captureBtn = screen.getByRole('button', { name: /Captura/i });
    expect(captureBtn).toBeDefined();
  });

  it('resolves screenshot URL with token when clicking Captura', async () => {
    renderWithProviders(<FeedbackReportsView />, {
      authValue: { token: 'valid-test-token-123' },
    });

    await waitFor(() => {
      expect(screen.getByText('Error al sincronizar curso')).toBeDefined();
    });

    const captureBtn = screen.getByRole('button', { name: /Captura/i });
    fireEvent.click(captureBtn);

    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toContain('token=valid-test-token-123');
    expect(img.getAttribute('src')).toContain('/webservice/pluginfile.php');
  });

  it('falls back to session-based pluginfile if token-based image fails', async () => {
    renderWithProviders(<FeedbackReportsView />, {
      authValue: { token: 'valid-test-token-123' },
    });

    await waitFor(() => {
      expect(screen.getByText('Error al sincronizar curso')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Captura/i }));

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('webservice/pluginfile.php');

    // Simulate image error (first load failure)
    fireEvent.error(img);

    // After fallback, the URL should switch to session cookie pluginfile without token
    await waitFor(() => {
      const fallbackImg = screen.getByRole('img');
      expect(fallbackImg.getAttribute('src')).toContain('/pluginfile.php');
      expect(fallbackImg.getAttribute('src')).not.toContain('/webservice/pluginfile.php');
      expect(fallbackImg.getAttribute('src')).not.toContain('token=');
    });
  });

  it('uses standard session pluginfile when no token is available', async () => {
    renderWithProviders(<FeedbackReportsView />, {
      authValue: { token: null },
    });

    await waitFor(() => {
      expect(screen.getByText('Error al sincronizar curso')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Captura/i }));

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('/pluginfile.php');
    expect(img.getAttribute('src')).not.toContain('/webservice/pluginfile.php');
  });
});
