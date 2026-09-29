import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLicenseUi } from '../context/LicenseUiContext';
import { Lock, AlertTriangle, ShieldAlert, KeyRound, X } from 'lucide-react';
import { Button } from './ui/Button';

export const LicenseBanner = () => {
  const { permissions, licenseStatus, licenseDaysLeft, licenseExpiresAt } = useAuth();
  const { openLicenseModal } = useLicenseUi();
  const [dismissed, setDismissed] = useState(false);

  // Do not render if active and more than 7 days left
  if (licenseStatus === 'active' && licenseDaysLeft > 7) {
    return null;
  }

  // Dismiss allowed ONLY when active and <= 7 days left
  if (dismissed && licenseStatus === 'active' && licenseDaysLeft <= 7) {
    return null;
  }

  const isAdmin = permissions?.can_config_site === 1 || permissions?.is_siteadmin === 1;

  const formattedExpiry = licenseExpiresAt
    ? new Date(licenseExpiresAt * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  // Message mapping (admin vs no-admin)
  let message = '';
  let variant = 'warning'; // 'warning' | 'error' | 'info'

  switch (licenseStatus) {
    case 'missing':
      message = isAdmin
        ? 'En modo solo lectura. Ingresa una clave de licencia para habilitar la gestión y edición.'
        : 'La consola está en modo solo lectura. Para habilitar cambios, contacta al administrador del sitio.';
      variant = 'info';
      break;

    case 'expired':
      message = isAdmin
        ? `Licencia vencida el ${formattedExpiry || 'recientemente'}. Ingresa una clave renovada.`
        : 'La licencia del sistema ha vencido. Contacta al administrador para renovarla.';
      variant = 'error';
      break;

    case 'tampered':
      message = 'Inconsistencia de reloj detectada en el servidor. Contacta al soporte técnico.';
      variant = 'error';
      break;

    case 'site_mismatch':
      message = isAdmin
        ? 'La clave de licencia no corresponde a este sitio Moodle. Ingresa una clave válida.'
        : 'Error de coincidencia de licencia con el sitio. Contacta al administrador.';
      variant = 'error';
      break;

    case 'invalid_format':
      message = isAdmin
        ? 'Formato de clave de licencia inválido. Verifica el token TMC-...'
        : 'Error en el formato de licencia. Contacta al administrador.';
      variant = 'error';
      break;

    case 'invalid_signature':
      message = isAdmin
        ? 'Firma criptográfica de la licencia inválida. Solicita una nueva clave.'
        : 'Firma de licencia inválida. Contacta al administrador.';
      variant = 'error';
      break;

    case 'active':
    default:
      if (licenseDaysLeft <= 7) {
        message = isAdmin
          ? `La licencia vence en ${licenseDaysLeft} día${licenseDaysLeft === 1 ? '' : 's'}. Renueva tu clave para evitar interrupciones.`
          : `La licencia vencerá en ${licenseDaysLeft} día${licenseDaysLeft === 1 ? '' : 's'}. Contacta al administrador para renovarla.`;
        variant = 'warning';
      }
      break;
  }

  if (!message) {
    return null;
  }

  const colorStyles = {
    info: 'bg-primary/10 border-primary/25 text-foreground',
    warning: 'bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-200',
    error: 'bg-destructive/15 border-destructive/30 text-destructive dark:text-red-300',
  };

  const Icon = variant === 'error' ? ShieldAlert : variant === 'warning' ? AlertTriangle : Lock;

  return (
    <aside
      aria-label="Aviso de Licencia"
      className={`relative w-full border-b px-4 py-2.5 transition-colors z-40 ${colorStyles[variant]}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 font-medium leading-tight">
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Button
              size="sm"
              variant={variant === 'error' ? 'destructive' : variant === 'warning' ? 'warning' : 'default'}
              onClick={openLicenseModal}
              className="h-7 text-xs px-3 shadow-none gap-1.5"
            >
              <KeyRound className="h-3 w-3" aria-hidden="true" />
              <span>{licenseStatus === 'active' ? 'Renovar clave' : 'Activar licencia'}</span>
            </Button>
          )}

          {licenseStatus === 'active' && licenseDaysLeft <= 7 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDismissed(true)}
              aria-label="Cerrar aviso temporalmente"
              className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};
