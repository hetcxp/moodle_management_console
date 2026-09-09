import React from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} props.onConfirm
 * @param {string} props.title - Requerido: título del diálogo de confirmación
 * @param {string} props.confirmText - Requerido: texto del botón de confirmación
 * @param {string} [props.description]
 * @param {string} [props.error] - Mensaje de error post-mutación a desplegar antes de cerrar
 * @param {boolean} [props.loading]
 * @param {string} [props.cancelText]
 * @param {string} [props.variant]
 */
export const ConfirmDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  error,
  loading, 
  confirmText, 
  cancelText = 'Cancelar', 
  variant = 'destructive' 
}) => {
  if (!title || !confirmText) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('ConfirmDialog: "title" y "confirmText" son props requeridas.');
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button 
            variant={variant} 
            onClick={onConfirm} 
            disabled={loading}
          >
            {loading ? 'Procesando...' : (confirmText || 'Confirmar')}
          </Button>
        </>
      }
    >
      {error && (
        <div 
          role="alert" 
          aria-live="assertive" 
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium"
        >
          {error}
        </div>
      )}
    </Dialog>
  );
};

ConfirmDialog.propTypes = {
  title: (props, propName, componentName) => {
    if (!props[propName]) {
      return new Error(`Prop \`${propName}\` es requerida en \`${componentName}\`.`);
    }
  },
  confirmText: (props, propName, componentName) => {
    if (!props[propName]) {
      return new Error(`Prop \`${propName}\` es requerida en \`${componentName}\`.`);
    }
  },
};
