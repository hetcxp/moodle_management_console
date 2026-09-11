import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export const Dialog = ({ open, onClose, onOpenChange, title, description, children, footer, maxWidth = 'max-w-lg' }) => {
  const modalRef = useRef(null);
  const lastFocusedElementRef = useRef(null);

  const handleClose = React.useCallback(() => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  }, [onClose, onOpenChange]);

  useEffect(() => {
    if (open && typeof document !== 'undefined') {
      lastFocusedElementRef.current = document.activeElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const focusTimer = setTimeout(() => {
        if (!modalRef.current) return;
        const firstFocusable = modalRef.current.querySelector(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 50);

      return () => {
        clearTimeout(focusTimer);
        document.body.style.overflow = originalOverflow;
        if (lastFocusedElementRef.current && typeof lastFocusedElementRef.current.focus === 'function') {
          const el = lastFocusedElementRef.current;
          lastFocusedElementRef.current = null;
          setTimeout(() => el.focus(), 0);
        }
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, handleClose]);

  const titleId = React.useId();
  const descId = React.useId();

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        className={cn(
          'relative z-10 w-full rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all animate-in zoom-in-95 max-h-[90vh] flex flex-col',
          maxWidth
        )}
      >
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            {title && <h2 id={titleId} className="text-lg font-bold tracking-tight text-foreground">{title}</h2>}
            {description && <p id={descId} className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="Descartar"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-0.5">{children}</div>

        {footer && (
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
