import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getTenantConfig } from '../config/tenant';
import { AuthService } from '../services/auth';
import { LogOut, User, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import { ThemeSelector } from './ThemeSelector';

export const Header = ({ onToggleSidebar, sidebarOpen, currentTheme, onSelectTheme }) => {
  const { user, logout, permissions } = useAuth();
  const tenant = getTenantConfig();

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

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            {tenant.name}
          </div>
          <div className="text-sm font-bold text-foreground">
            {tenant.subtitle}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Selector de tema visual */}
        <ThemeSelector
          currentTheme={currentTheme}
          onSelectTheme={onSelectTheme}
        />

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
