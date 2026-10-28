import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  AlertTriangle,
  Bug,
  Lightbulb,
  Image as ImageIcon,
  Trash2,
  Maximize2,
  Loader2,
  CheckCircle2,
  Info
} from 'lucide-react';
import { FeedbackApi } from '../../services/api/feedback-api';
import { useToast } from '../ui/Toast';

export const FeedbackModal = ({
  open,
  onClose,
  initialScreenshot = '',
  onNavigateToReports
}) => {
  const { addToast } = useToast();
  const [type, setType] = useState('issue');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState(initialScreenshot);
  const [showFullImage, setShowFullImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (open) {
      setScreenshot(initialScreenshot);
      setDescription('');
      setType('issue');
    }
  }, [open, initialScreenshot]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        if (showFullImage) {
          setShowFullImage(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, showFullImage, onClose]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.hash : '';
  const resolution = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      addToast({
        type: 'warning',
        title: 'Descripción requerida',
        description: 'Por favor describe el detalle de tu reporte antes de enviar.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await FeedbackApi.submitFeedback({
        type,
        description: description.trim(),
        pageurl: currentUrl,
        useragent: userAgent,
        resolution,
        screenshotBase64: screenshot || '',
      });

      if (res?.success) {
        addToast({
          type: 'success',
          title: 'Reporte enviado',
          description: `Ticket #${res.feedbackid} registrado. El equipo de soporte ha sido notificado.`,
        });
        onClose();
      } else {
        throw new Error(res?.message || 'Error desconocido al procesar el reporte');
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al enviar reporte',
        description: err.message || 'No se pudo comunicar con el servidor.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const typeConfig = [
    { id: 'issue', label: 'Problema', icon: AlertTriangle, color: 'text-amber-500 border-amber-500/30 bg-amber-500/10' },
    { id: 'error', label: 'Error Técnico', icon: Bug, color: 'text-rose-500 border-rose-500/30 bg-rose-500/10' },
    { id: 'suggestion', label: 'Sugerencia', icon: Lightbulb, color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' },
  ];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
          <div>
            <h2 id="feedback-modal-title" className="text-base font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
              Enviar Reporte o Sugerencia
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tu mensaje y captura llegarán directamente al equipo de soporte.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Tipo de reporte
            </label>
            <div className="grid grid-cols-3 gap-2">
              {typeConfig.map((item) => {
                const Icon = item.icon;
                const isSelected = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id)}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? `${item.color} shadow-sm border-current font-bold`
                        : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="feedback-desc" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Descripción detallada
              </label>
              <span className="text-[11px] text-muted-foreground">
                {description.length} / 2000
              </span>
            </div>
            <textarea
              id="feedback-desc"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica qué ocurrió, qué esperabas que pasara o qué mejora propones..."
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
              autoFocus
            />
          </div>

          {/* Screenshot Preview */}
          {screenshot && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Captura del Viewport (WebP)
                </span>
                <button
                  type="button"
                  onClick={() => setScreenshot('')}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 font-medium transition-colors"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  Remover captura
                </button>
              </div>
              <div className="relative group overflow-hidden rounded-xl border border-border bg-muted/40 max-h-48 w-full flex items-center justify-center">
                <img
                  src={screenshot}
                  alt="Captura de pantalla previa"
                  className="max-h-48 w-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <button
                  type="button"
                  onClick={() => setShowFullImage(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  Ver en tamaño completo
                </button>
              </div>
            </div>
          )}

          {/* Diagnostic Info & Privacy disclaimer */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 text-foreground/80 font-medium">
              <Info className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
              Metadatos técnicos adjuntos:
            </div>
            <p className="text-[11px] truncate">
              <strong>Ruta:</strong> {currentUrl || '/'} | <strong>Resolución:</strong> {resolution}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {onNavigateToReports && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToReports();
                }}
                className="text-xs text-primary hover:underline font-medium"
              >
                Ver mis soportes anteriores
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    Enviar Reporte
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Full Image Zoom Modal */}
      {showFullImage && screenshot && (
        <div
          role="dialog"
          aria-label="Captura ampliada"
          className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] overflow-auto rounded-xl border border-white/20">
            <img src={screenshot} alt="Captura ampliada" className="w-full h-auto" />
            <button
              type="button"
              onClick={() => setShowFullImage(false)}
              className="absolute top-3 right-3 rounded-full bg-black/70 p-2 text-white hover:bg-black transition-colors"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default FeedbackModal;
