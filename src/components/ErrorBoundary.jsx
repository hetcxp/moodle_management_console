import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

const ErrorFallback = ({ error, onReset }) => {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle size={40} />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-foreground">Algo salió mal</h2>
      <p className="mb-6 max-w-md text-muted-foreground">
        Ha ocurrido un error inesperado al cargar esta vista. Puedes intentar recargar la página o volver a intentar.
      </p>

      {error && (
        <div className="mb-8 w-full max-w-lg rounded-md bg-muted p-4 text-left font-mono text-sm text-foreground overflow-auto">
          {error.toString()}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <RefreshCcw size={18} />
          Reintentar
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md border border-border bg-card px-4 py-2 font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Recargar página
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
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

