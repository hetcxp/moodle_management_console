import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { AdminerApi } from '../services/adminer-api';
import { Copy, Check, Key, AlertCircle, CheckCircle2, Loader2, ShieldCheck, Trash2 } from 'lucide-react';

const ERROR_MESSAGES = {
  site_mismatch: 'La clave no corresponde a este sitio.',
  expired: 'La clave ya venció.',
  invalid_format: 'Formato inválido. Verifica el token TMC-...',
  invalid_signature: 'Firma inválida. Solicita nueva clave.',
  tampered: 'Inconsistencia de reloj. Contacta soporte.',
};

export const LicenseModal = ({ isOpen, onClose }) => {
  const {
    siteId,
    activateLicense,
    removeLicense,
    isLicensed,
    licenseDaysLeft,
    licenseExpiresAt,
  } = useAuth();

  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const siteInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (isOpen) {
      setLicenseKey('');
      setResult(null);
      setCopied(false);
      setCopyFeedback('');

      if (isLicensed) {
        AdminerApi.getLicenseInfo()
          .then((info) => {
            if (active && info?.valid) {
              setLicenseInfo(info);
            }
          })
          .catch(() => {});
      } else {
        setLicenseInfo(null);
      }
    }
    return () => {
      active = false;
    };
  }, [isOpen, isLicensed]);

  const handleCopySiteId = async () => {
    if (!siteId) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(siteId);
        setCopied(true);
        setCopyFeedback('¡ID copiado al portapapeles!');
        setTimeout(() => {
          setCopied(false);
          setCopyFeedback('');
        }, 2500);
      } else {
        throw new Error('Clipboard API no disponible');
      }
    } catch {
      if (siteInputRef.current) {
        siteInputRef.current.select();
        setCopyFeedback('Presiona Ctrl+C (o Cmd+C) para copiar');
      }
    }
  };

  const handleActivate = async (e) => {
    if (e) e.preventDefault();
    const key = licenseKey.trim();
    if (!key) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await activateLicense(key);
      setResult(res);
      if (res?.valid) {
        setLicenseInfo(res);
        setLicenseKey('');
      }
    } catch (err) {
      setResult({
        valid: false,
        status: 'error',
        message: err?.message || 'Error al conectar con el servidor',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeLicense();
      setLicenseInfo(null);
      setResult({
        valid: false,
        status: 'removed',
        message: 'Licencia removida correctamente. La consola opera en modo solo lectura.',
      });
      setShowConfirmRemove(false);
    } catch (err) {
      setResult({
        valid: false,
        status: 'error',
        message: err?.message || 'Error al remover la licencia',
      });
      setShowConfirmRemove(false);
    } finally {
      setRemoving(false);
    }
  };

  const effectiveExpiresAt = result?.expires_at || licenseInfo?.expires_at || licenseExpiresAt;
  const effectiveDaysLeft = result?.days_left ?? licenseInfo?.days_left ?? licenseDaysLeft;

  const formattedExpiry = effectiveExpiresAt
    ? new Date(effectiveExpiresAt * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        title="Gestión de Licencia"
        description="Consulta los detalles de tu suscripción o actualiza tu clave Ed25519."
        maxWidth="max-w-lg"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <div>
              {isLicensed && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowConfirmRemove(true)}
                  disabled={loading || removing}
                  className="gap-1.5 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Remover Licencia</span>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading || removing}>
                Cerrar
              </Button>
              <Button
                variant="default"
                onClick={handleActivate}
                disabled={loading || removing || !licenseKey.trim()}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>{isLicensed ? 'Actualizando...' : 'Activando...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span>{isLicensed ? 'Actualizar Licencia' : 'Activar Licencia'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5 py-1">
          {/* Current status if already licensed */}
          {isLicensed && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm space-y-2.5 text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center justify-between pb-1.5 border-b border-emerald-500/20">
                <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Licencia activa</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  {licenseInfo?.tier || 'Enterprise'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Cliente</span>
                  <span className="font-medium text-foreground">{licenseInfo?.client_name || 'Registrado'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Vencimiento</span>
                  <span className="font-medium text-foreground">{formattedExpiry || 'Vigente'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Días restantes</span>
                  <span className="font-medium text-foreground">
                    {effectiveDaysLeft} día{effectiveDaysLeft === 1 ? '' : 's'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">ID de Licencia</span>
                  <span className="font-mono text-[10px] text-foreground truncate block">{licenseInfo?.license_id || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* 1. Site ID section */}
          <div className="space-y-1.5">
            <label htmlFor="license-site-id" className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-muted-foreground" />
              ID del Sitio Moodle (Site Identifier)
            </label>
            <div className="flex gap-2">
              <input
                id="license-site-id"
                ref={siteInputRef}
                type="text"
                readOnly
                value={siteId || 'Obteniendo identificador...'}
                className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-border bg-muted/50 text-foreground select-all focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopySiteId}
                className="shrink-0 gap-1.5 text-xs h-9"
                aria-label="Copiar ID de Sitio"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Copiar</span>
                  </>
                )}
              </Button>
            </div>
            {copyFeedback && (
              <p className="text-[11px] text-muted-foreground animate-in fade-in">
                {copyFeedback}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Proporciona este ID al proveedor para generar tu clave de activación.
            </p>
          </div>

          {/* 2. License key textarea */}
          <div className="space-y-1.5">
            <label htmlFor="license-key-input" className="text-xs font-bold text-foreground">
              {isLicensed ? 'Actualizar Clave de Activación (TMC-...)' : 'Código de Activación (TMC-...)'}
            </label>
            <textarea
              id="license-key-input"
              rows={3}
              autoComplete="off"
              spellCheck="false"
              placeholder="Pega aquí la clave de licencia TMC-eyJ..."
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              disabled={loading || removing}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-y"
            />
          </div>

          {/* 3. Result message */}
          {result && (
            <div
              role="alert"
              className={`rounded-xl border p-3.5 text-xs flex items-start gap-3 transition-all animate-in fade-in ${
                result.valid
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                  : result.status === 'removed'
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200'
                  : 'border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive'
              }`}
            >
              {result.valid ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : result.status === 'removed' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
              )}
              <div className="space-y-1">
                {result.valid ? (
                  <>
                    <p className="font-semibold text-sm">¡Licencia activada con éxito!</p>
                    <p className="opacity-90">
                      Cliente: <span className="font-medium">{result.client_name}</span> | Vencimiento: <span className="font-medium">{formattedExpiry}</span> ({result.days_left} día{result.days_left === 1 ? '' : 's'} restantes).
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-sm">
                      {result.status === 'removed' ? 'Licencia removida' : 'Error en la validación'}
                    </p>
                    <p className="opacity-90">
                      {ERROR_MESSAGES[result.status] || result.message || 'La clave proporcionada no es válida.'}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={showConfirmRemove}
        onClose={() => setShowConfirmRemove(false)}
        onConfirm={handleRemove}
        title="¿Remover licencia activa?"
        description="Al remover la clave de activación, la Consola de Gestión volverá a operar en modo de solo lectura. ¿Deseas proceder?"
        confirmText="Remover Licencia"
        cancelText="Cancelar"
        loading={removing}
        variant="destructive"
      />
    </>
  );
};

