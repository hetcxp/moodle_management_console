import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/auth';
import { LogOut, User, ShieldCheck, HelpCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { ThemeSelector } from './ThemeSelector';
import { useHelp } from '../context/HelpContext';

function resolveHeaderContext(pathname) {
  if (!pathname || pathname === '/' || pathname === '/dashboard') {
    return { section: 'Consola', title: 'Panel Principal' };
  }
  if (pathname.startsWith('/courses')) {
    if (pathname.includes('/users/')) return { section: 'Cursos', title: 'Progreso de Usuario' };
    if (pathname !== '/courses') return { section: 'Cursos', title: 'Detalle de Curso' };
    return { section: 'Catálogo Curricular', title: 'Gestión de Cursos' };
  }
  if (pathname.startsWith('/categories')) {
    if (pathname !== '/categories') return { section: 'Categorías', title: 'Detalle de Categoría' };
    return { section: 'Catálogo Curricular', title: 'Gestión de Categorías' };
  }
  if (pathname.startsWith('/users')) {
    if (pathname !== '/users') return { section: 'Directorio', title: 'Detalle de Usuario' };
    return { section: 'Directorio', title: 'Gestión de Usuarios' };
  }
  if (pathname.startsWith('/cohorts')) {
    if (pathname !== '/cohorts') return { section: 'Directorio', title: 'Detalle de Cohorte' };
    return { section: 'Directorio', title: 'Gestión de Cohortes' };
  }
  if (pathname.startsWith('/learning-paths')) {
    if (pathname !== '/learning-paths') return { section: 'Rutas Formativas', title: 'Detalle de Ruta' };
    return { section: 'Rutas Formativas', title: 'Rutas de Aprendizaje' };
  }
  if (pathname.startsWith('/competencies')) {
    if (pathname.startsWith('/competencies/scales')) return { section: 'Competencias', title: 'Escalas de Calificación' };
    if (pathname.startsWith('/competencies/rubrics')) {
      if (pathname.endsWith('/new')) return { section: 'Rúbricas', title: 'Nueva Rúbrica' };
      if (pathname.endsWith('/edit')) return { section: 'Rúbricas', title: 'Editor de Rúbrica' };
      if (pathname !== '/competencies/rubrics') return { section: 'Rúbricas', title: 'Detalle de Rúbrica' };
      return { section: 'Competencias', title: 'Plantillas de Rúbricas' };
    }
    if (pathname.includes('/detail/')) return { section: 'Competencias', title: 'Detalle de Competencia' };
    if (pathname !== '/competencies') return { section: 'Competencias', title: 'Marco de Competencias' };
    return { section: 'Competencias', title: 'Marcos y Competencias' };
  }
  if (pathname.startsWith('/reports')) {
    return { section: 'Analítica', title: 'Reportes y Auditoría' };
  }
  return { section: 'Consola', title: 'Panel de Control' };
}

export const Header = ({ onToggleSidebar, sidebarOpen, currentTheme, onSelectTheme }) => {
  const { user, logout, permissions } = useAuth();
  const { isOpen, toggle } = useHelp();
  const [location] = useLocation();
  const context = resolveHeaderContext(location);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/80 px-6 backdrop-blur-md transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Abrir menú de navegación"
          aria-expanded={Boolean(sidebarOpen)}
          aria-controls="sidebar"
          className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <svg className="h-6 w-6" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 leading-none">
            {context.section}
          </span>
          <span className="text-sm font-bold text-foreground leading-tight mt-0.5">
            {context.title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Selector de tema visual */}
        <ThemeSelector
          currentTheme={currentTheme}
          onSelectTheme={onSelectTheme}
        />

        {/* Botón de Ayuda Contextual */}
        <button
          id="help-button"
          type="button"
          onClick={() => toggle()}
          aria-label="Ayuda de la pantalla actual"
          aria-expanded={isOpen}
          title="Ayuda de la pantalla actual (?)"
          className="relative inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        >
          <HelpCircle className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* User profile capsule */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-border/70">
            <div className="hidden sm:flex flex-col text-right">
              <div className="text-sm font-semibold text-foreground leading-tight flex items-center gap-1.5 justify-end">
                {user.fullname || user.username}
                {permissions?.is_siteadmin === 1 && (
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-label="Administrador del Sitio" />
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                @{user.username}
              </div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm ring-2 ring-primary/20">
              {user.fullname ? user.fullname.charAt(0).toUpperCase() : <User className="h-4 w-4" aria-hidden="true" />}
            </div>

            {!AuthService.isEmbedded() && (
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                aria-label="Cerrar sesión"
                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
