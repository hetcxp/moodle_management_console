import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2 } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useScaleAction } from '../../hooks/queries/useCompetencyQueries';

export function ScaleFormModal({
  open,
  onClose,
  scale = null,
  onSuccess,
}) {
  const { addToast } = useToast();
  const { mutateAsync: performScaleAction, isPending } = useScaleAction();

  const isEditing = Boolean(scale);
  const isLocked = Boolean(scale?.locked === 1);

  const [name, setName] = useState('');
  const [itemsString, setItemsString] = useState('');

  useEffect(() => {
    if (open) {
      if (scale) {
        setName(scale.name || '');
        setItemsString(Array.isArray(scale.items) ? scale.items.join(', ') : '');
      } else {
        setName('');
        setItemsString('No competente, Competente');
      }
    }
  }, [open, scale]);

  const parsedItems = itemsString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      addToast({ title: 'Campo requerido', description: 'Ingresa un nombre para la escala.', type: 'warning' });
      return;
    }

    if (!isEditing && parsedItems.length < 2) {
      addToast({
        title: 'Niveles insuficientes',
        description: 'La escala debe contener al menos 2 niveles separados por comas.',
        type: 'warning',
      });
      return;
    }

    try {
      if (isEditing) {
        await performScaleAction({
          action: 'update',
          scaleid: scale.id,
          name: name.trim(),
          items: isLocked ? '' : parsedItems.join(','),
        });
        addToast({ title: 'Escala actualizada', description: `La escala "${name}" ha sido actualizada.`, type: 'success' });
      } else {
        await performScaleAction({
          action: 'create',
          name: name.trim(),
          items: parsedItems.join(','),
        });
        addToast({ title: 'Escala creada', description: `La escala "${name}" fue creada exitosamente.`, type: 'success' });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      addToast({
        title: 'Error al guardar',
        description: err?.message || 'No se pudo guardar la escala.',
        type: 'error',
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? `Editar Escala: ${scale.name}` : 'Nueva Escala de Evaluación'}
      description="Define el nombre y los niveles de evaluación ordenados de menor a mayor dominio."
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name.trim() || (!isEditing && parsedItems.length < 2)}
          >
            {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Escala'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            Nombre de la Escala *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Escala de Habilidades Digitales 2026"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            Niveles de Evaluación *
          </label>

          {isLocked ? (
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Escala protegida:</strong> Existen registros de calificaciones en Moodle vinculados a esta escala. Los niveles no pueden modificarse para preservar la integridad histórica, pero sí puedes actualizar el nombre.
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded-md border border-border">
                {scale?.items?.map((item, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-background rounded font-medium text-foreground border border-border/60"
                  >
                    {i + 1}. {item}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                value={itemsString}
                onChange={(e) => setItemsString(e.target.value)}
                placeholder="Insuficiente, Básico, Autónomo, Sobresaliente"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Ingresa los niveles separados por comas, ordenados progresivamente de menor a mayor calificación.
              </p>

              {parsedItems.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg border border-border/60 space-y-1.5">
                  <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Vista previa de niveles ({parsedItems.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {parsedItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-xs text-foreground font-medium shadow-2xs"
                      >
                        <span className="text-muted-foreground text-[10px]">{idx + 1}.</span>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}
