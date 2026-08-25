import React from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';

export const ConfirmDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  loading, 
  confirmText, 
  cancelText = 'Cancelar', 
  variant = 'destructive' 
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button 
            variant={variant} 
            onClick={onConfirm} 
            disabled={loading}
          >
            {loading ? 'Procesando...' : confirmText}
          </Button>
        </>
      }
    />
  );
};
