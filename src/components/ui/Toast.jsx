import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, description, type = 'info', duration = 4000 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-md w-full">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
            error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
            warning: <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />,
            info: <Info className="h-5 w-5 text-primary shrink-0" />,
          };

          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-xl text-card-foreground animate-fadeIn',
                toast.type === 'error' && 'border-rose-500/30 bg-rose-50/10 dark:bg-rose-950/20',
                toast.type === 'success' && 'border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/20'
              )}
            >
              {icons[toast.type] || icons.info}
              <div className="flex-1 space-y-0.5">
                {toast.title && <div className="text-sm font-semibold">{toast.title}</div>}
                {toast.description && <div className="text-xs text-muted-foreground">{toast.description}</div>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
