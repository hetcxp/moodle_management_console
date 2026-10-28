import React, { useState } from 'react';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { captureViewport } from '../../lib/feedbackCapture';
import { FeedbackModal } from './FeedbackModal';

export const FeedbackFab = ({ onNavigateToReports }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [screenshot, setScreenshot] = useState('');

  // Check if feature is enabled in injected global config
  const isEnabled = typeof window !== 'undefined'
    ? window.MANAGEMENT_CONSOLE_CONFIG?.feedbackEnabled !== false
    : true;

  if (!isEnabled) {
    return null;
  }

  const handleOpenFeedback = async () => {
    if (capturing) return;
    setCapturing(true);

    let screenshotData = '';
    try {
      screenshotData = await captureViewport();
    } finally {
      setCapturing(false);
      setScreenshot(screenshotData);
      setModalOpen(true);
    }
  };

  return (
    <>
      <div className="feedback-fab-container fixed bottom-6 right-6 z-[10000]" data-feedback-ignore="true">
        <button
          type="button"
          onClick={handleOpenFeedback}
          disabled={capturing}
          aria-label="Reportar problema o sugerencia"
          title="Reportar problema o sugerencia"
          className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/85 text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all focus:outline-none focus:ring-4 focus:ring-primary/30"
        >
          {capturing ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
          ) : (
            <MessageSquarePlus className="h-6 w-6 text-white transition-transform group-hover:scale-110" aria-hidden="true" />
          )}

          {/* Floating pill label on hover */}
          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-xl bg-popover px-3 py-1.5 text-xs font-semibold text-popover-foreground shadow-lg border border-border lg:group-hover:inline-block transition-opacity animate-fadeIn">
            Reportar error o sugerencia
          </span>
        </button>
      </div>

      <FeedbackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialScreenshot={screenshot}
        onNavigateToReports={onNavigateToReports}
      />
    </>
  );
};

export default FeedbackFab;
