import React from 'react';
import { Button } from '../../components/ui/Button';
import { BookOpen, Users, FolderTree } from 'lucide-react';

export const QuickActionsCard = ({ onNavigate }) => {
  return (
    <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">
            Acciones Administrativas Rápidas
          </h2>
          <p className="text-sm text-muted-foreground">
            Accede directamente a los módulos de gestión masiva.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button onClick={() => onNavigate('courses')} className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Gestionar Cursos</span>
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('users')} className="gap-2">
            <Users className="h-4 w-4" />
            <span>Gestionar Usuarios</span>
          </Button>
          <Button variant="outline" onClick={() => onNavigate('categories')} className="gap-2">
            <FolderTree className="h-4 w-4" />
            <span>Categorías</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
