import React from 'react';
import { Button } from '../components/ui/Button';
import { ShieldAlert, Home } from 'lucide-react';

export const NotFoundView = ({ onNavigateHome }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fadeIn">
      <div className="h-20 w-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
        <ShieldAlert className="h-10 w-10 text-rose-500" />
      </div>
      <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-2">404</h1>
      <h2 className="text-xl font-semibold text-foreground mb-4">Página no encontrada</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        La ruta a la que intentas acceder no existe o no tienes los permisos necesarios para visualizarla en Moodle Adminer.
      </p>
      <Button onClick={onNavigateHome} size="lg" className="gap-2">
        <Home className="h-4 w-4" />
        Volver al Inicio
      </Button>
    </div>
  );
};
