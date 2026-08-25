import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

const ErrorFallback = ({ error, onReset }) => {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle size={40} />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-gray-900">Algo salió mal</h2>
      <p className="mb-6 max-w-md text-gray-500">
        Ha ocurrido un error inesperado al cargar esta vista. Puedes intentar recargar la página o volver a intentar.
      </p>
      
      {error && (
        <div className="mb-8 w-full max-w-lg rounded-md bg-gray-100 p-4 text-left font-mono text-sm text-gray-800 overflow-auto">
          {error.toString()}
        </div>
      )}
      
      <div className="flex gap-4">
        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <RefreshCcw size={18} />
          Reintentar
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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

export default ErrorBoundary;
