import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, HelpCircle, ArrowRight, ShieldCheck, ChevronDown } from 'lucide-react';
import { useHelp } from '../../context/HelpContext';
import { cn } from '../../lib/utils';
import { Badge } from './Badge';

export const HelpDrawer = () => {
  const { isOpen, close, viewId, helpData } = useHelp();
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus trap setup
    const timer = setTimeout(() => {
      if (!drawerRef.current) return;
      const closeBtn = drawerRef.current.querySelector('button[aria-label="Cerrar ayuda"]');
      if (closeBtn) {
        closeBtn.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        const helpBtn = document.getElementById('help-button');
        if (helpBtn) helpBtn.focus();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), details summary'
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

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 transition-all duration-300 pointer-events-none',
        isOpen ? 'pointer-events-auto' : 'opacity-0'
      )}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-drawer-title"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:max-w-md bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="help-drawer-title" className="text-base font-semibold text-foreground truncate">
                {helpData?.title || 'Ayuda Contextual'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] font-mono tracking-wider uppercase px-1.5 py-0">
                  {viewId}
                </Badge>
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar ayuda"
            onClick={close}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Summary / Purpose */}
          <section aria-labelledby="help-section-summary">
            <h3 id="help-section-summary" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Propósito Operativo
            </h3>
            <div className="rounded-lg bg-muted/40 p-3.5 text-sm text-foreground/90 leading-relaxed border border-border/50">
              {helpData?.summary || 'No hay información de orientación disponible para esta vista.'}
            </div>
          </section>

          {/* KPIs Context */}
          {helpData?.kpisHelp && Object.keys(helpData.kpisHelp).length > 0 && (
            <section aria-labelledby="help-section-kpis">
              <h3 id="help-section-kpis" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center justify-between">
                <span>Métricas e Indicadores</span>
                <span className="text-[10px] font-medium font-mono text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                  {Object.keys(helpData.kpisHelp).length}
                </span>
              </h3>
              <div className="space-y-2">
                {Object.entries(helpData.kpisHelp).map(([name, desc]) => (
                  <details
                    key={name}
                    className="group border border-border/60 rounded-lg bg-card overflow-hidden transition-all"
                  >
                    <summary className="flex items-center justify-between p-3 text-xs font-semibold text-foreground cursor-pointer select-none hover:bg-muted/30 list-none [&::-webkit-details-marker]:hidden">
                      <span className="truncate pr-2">{name}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="p-3 pt-0 text-xs text-muted-foreground border-t border-border/30 mt-1">
                      <p className="pt-1.5 leading-normal">{desc}</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Actions & Profiles */}
          {helpData?.actions && helpData.actions.length > 0 && (
            <section aria-labelledby="help-section-actions">
              <h3 id="help-section-actions" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center justify-between">
                <span>Acciones Disponibles</span>
                <span className="text-[10px] font-medium font-mono text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                  {helpData.actions.length}
                </span>
              </h3>
              <div className="space-y-2">
                {helpData.actions.map((act, idx) => (
                  <details
                    key={idx}
                    className="group border border-border/60 rounded-lg bg-card overflow-hidden transition-all"
                  >
                    <summary className="flex items-center justify-between p-3 text-xs font-semibold text-foreground cursor-pointer select-none hover:bg-muted/30 list-none [&::-webkit-details-marker]:hidden">
                      <span className="truncate pr-2">{act.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {act.shortcut && (
                          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted text-muted-foreground rounded border border-border">
                            {act.shortcut}
                          </kbd>
                        )}
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-open:rotate-180" />
                      </div>
                    </summary>
                    <div className="p-3 pt-0 text-xs text-muted-foreground space-y-2 border-t border-border/30 mt-1">
                      <p className="pt-1.5 leading-normal">
                        {act.description}
                      </p>
                      {act.requiredRole && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground/90 font-medium pt-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary/70 shrink-0" aria-hidden="true" />
                          <span>Perfil: <strong className="text-foreground/80">{act.requiredRole}</strong></span>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Workflows / Guides */}
          {helpData?.workflows && helpData.workflows.length > 0 && (
            <section aria-labelledby="help-section-workflows">
              <h3 id="help-section-workflows" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center justify-between">
                <span>Flujos de Trabajo</span>
                <span className="text-[10px] font-medium font-mono text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                  {helpData.workflows.length}
                </span>
              </h3>
              <div className="space-y-2">
                {helpData.workflows.map((wf, idx) => (
                  <details
                    key={idx}
                    className="group border border-border/60 rounded-lg bg-card overflow-hidden transition-all"
                  >
                    <summary className="flex items-center justify-between p-3 text-xs font-semibold text-foreground cursor-pointer select-none hover:bg-muted/30 list-none [&::-webkit-details-marker]:hidden">
                      <span className="truncate pr-2">{wf.title}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="p-3 pt-0 text-xs text-muted-foreground space-y-1.5 border-t border-border/30 mt-1">
                      {wf.steps.map((step, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-2 pt-1.5">
                          <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                          <span className="leading-normal">{step}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Atajo global: <kbd className="px-1 py-0.5 bg-muted rounded border border-border font-mono">?</kbd></span>
          <span>Cerrar: <kbd className="px-1 py-0.5 bg-muted rounded border border-border font-mono">Esc</kbd></span>
        </div>
      </aside>
    </div>,
    document.body
  );
};
