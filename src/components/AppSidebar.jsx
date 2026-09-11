import React from 'react';
import { LayoutDashboard, BookOpen, FolderTree, Users, Layers, Award, Shield, Sparkles, DownloadCloud } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const AppSidebar = ({ activeTab, onTabChange: _onTabChange, open, onClose }) => {
  const { permissions } = useAuth();

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Panel Principal',
      icon: LayoutDashboard,
      capability: 'can_config_site',
    },
    {
      id: 'courses',
      label: 'Gestión de Cursos',
      icon: BookOpen,
      capability: 'can_view_courses',
    },
    {
      id: 'categories',
      label: 'Categorías',
      icon: FolderTree,
      capability: 'can_manage_categories',
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: Users,
      capability: 'can_view_users',
    },
    {
      id: 'cohorts',
      label: 'Cohortes',
      icon: Layers,
      capability: 'can_view_cohorts',
    },
    {
      id: 'competencies',
      label: 'Competencias',
      icon: Award,
      capability: 'can_view_competencies',
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: DownloadCloud,
      capability: 'can_view_courses', // Usamos can_view_courses como base
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden w-full cursor-default"
          onClick={onClose}
        />
      )}

      <aside
        id="sidebar"
        role={open ? 'dialog' : undefined}
        aria-modal={open ? 'true' : undefined}
        aria-label={open ? 'Menú de navegación' : undefined}
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary/70 text-primary-foreground shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-sidebar-foreground">Moodle Adminer</span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-sidebar-primary">Headless Studio</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav aria-label="Navegación principal" className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
            Administración
          </div>

          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasPermission = permissions?.is_siteadmin === 1 || permissions?.[item.capability] === 1;

            if (!hasPermission) {
              return (
                <span
                  key={item.id}
                  aria-disabled="true"
                  title={`Sin permiso: ${item.capability}`}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium opacity-40 cursor-not-allowed text-sidebar-foreground/50"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide">Sin acceso</span>
                </span>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.id === 'dashboard' ? '/' : `/${item.id}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onClose?.()}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30 font-semibold'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 transition-transform group-hover:scale-110',
                    isActive ? 'text-primary-foreground' : 'text-sidebar-foreground/60'
                  )}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom system status */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3 text-xs">
            <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <div className="font-semibold text-sidebar-foreground">API Moodle 5.x</div>
              <div className="text-[10px] text-sidebar-foreground/60 truncate">management_console_service activo</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
