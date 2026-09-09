/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { getTenantConfig } from '../config/tenant';

const ErrorFallback = ({ error, onReset, viewName }) => {
  const tenantConfig = getTenantConfig();
  const supportText = tenantConfig?.supportInstructions || 'contacta al soporte técnico si el problema persiste.';
  const title = viewName ? `Error al cargar ${viewName}` : 'Algo salió mal';

  return (
    <div role="alert" aria-live="assertive" className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle size={40} aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">{title}</h1>
      <p className="mb-6 max-w-md text-muted-foreground">
        Ocurrió un error inesperado. Intenta recargar la página o {supportText}
      </p>

      {import.meta.env.DEV && error && (
        <details className="mb-8 w-full max-w-lg text-left">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-2">
            Detalles técnicos (solo en desarrollo)
          </summary>
          <div className="rounded-md bg-muted p-4 font-mono text-sm text-foreground overflow-auto">
            {error.toString()}
          </div>
        </details>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Recargar página
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <RefreshCcw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    </div>
  );
};

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    if (import.meta.env.DEV) console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error} 
          viewName={this.props.viewName}
          onReset={() => this.setState({ hasError: false })} 
        />
      );
    }
    return this.props.children;
  }
}

