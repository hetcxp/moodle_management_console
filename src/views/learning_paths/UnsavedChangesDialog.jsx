import React from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, Save } from 'lucide-react';

/**
 * Diálogo modal para prevenir pérdida de cambios en la estructura de rutas formativas.
 * Presenta 3 opciones deterministas:
 * 1. onSaveAndContinue: Guarda la mutación y transiciona a la pestaña/ruta destino.
 * 2. onDiscard: Descarta el borrador en memoria y transiciona a destino.
 * 3. onStay: Cancela la navegación y permanece en la pestaña actual.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onStay
 * @param {() => void} props.onDiscard
 * @param {() => void} props.onSaveAndContinue
 * @param {boolean} [props.loading]
 */
export const UnsavedChangesDialog = ({
  open,
  onStay,
  onDiscard,
  onSaveAndContinue,
  loading = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onStay}
      title="Cambios sin guardar en la estructura"
      description="Tienes modificaciones en la secuencia modular de la ruta que no han sido guardadas en Moodle. ¿Cómo deseas proceder antes de salir?"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <Button variant="outline" onClick={onStay} disabled={loading}>
            Permanecer aquí
          </Button>
          <Button variant="destructive" onClick={onDiscard} disabled={loading}>
            Descartar y salir
          </Button>
          <Button
            variant="default"
            onClick={onSaveAndContinue}
            disabled={loading}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              'Guardando...'
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar y continuar
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-foreground">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-600 dark:text-amber-400">
            Atención: Modificaciones no persistidas
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Si decides descartar los cambios, la secuencia de subcursos y las reglas de prelación
            volverán al último estado persistido en el servidor. Si eliges guardar, se sincronizarán
            inmediatamente con Moodle antes de navegar.
          </p>
        </div>
      </div>
    </Dialog>
  );
};
