import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export const Dialog = ({ open, onClose, onOpenChange, title, description, children, footer, maxWidth = 'max-w-lg' }) => {
  const dialogRef = useRef(null);
  const lastFocusedElementRef = useRef(null);

  const handleClose = React.useCallback(() => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  }, [onClose, onOpenChange]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      lastFocusedElementRef.current = document.activeElement;
      if (typeof dialog.showModal === 'function' && !dialog.open) {
        try {
          dialog.showModal();
        } catch {
          // Fallback if already open
        }
      }
      // Focus first focusable element
      const firstFocusable = dialog.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }

    return () => {
      if (dialog && typeof dialog.close === 'function' && dialog.open) {
        try {
          dialog.close();
        } catch {
          // Fallback
        }
      }
      if (lastFocusedElementRef.current && typeof lastFocusedElementRef.current.focus === 'function') {
        const el = lastFocusedElementRef.current;
        lastFocusedElementRef.current = null;
        setTimeout(() => el.focus(), 0);
      }
    };
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        const focusables = dialog.querySelectorAll(
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

    const handleNativeClose = () => {
      handleClose();
    };

    const handleCancel = (e) => {
      e.preventDefault();
      handleClose();
    };

    dialog.addEventListener('keydown', handleKeyDown);
    dialog.addEventListener('close', handleNativeClose);
    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      dialog.removeEventListener('close', handleNativeClose);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [open, handleClose]);

  const titleId = React.useId();
  const descId = React.useId();

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      open={open}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className={cn(
        'w-full rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop:bg-background/80 backdrop:backdrop-blur-sm overflow-y-auto',
        maxWidth
      )}
      onClick={(e) => { if (e.target === dialogRef.current) handleClose(); }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {title && <h2 id={titleId} className="text-lg font-bold tracking-tight text-foreground">{title}</h2>}
          {description && <p id={descId} className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          aria-label="Descartar"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-4">{children}</div>

      {footer && (
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/50">
          {footer}
        </div>
      )}
    </dialog>
  );
};
