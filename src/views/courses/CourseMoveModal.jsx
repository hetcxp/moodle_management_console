import React, { useState, useEffect } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { AdminerApi } from '../../services/adminer-api';

export const CourseMoveModal = ({ open, onClose, onSuccess, categoriesList, coursesToMove }) => {
  const { addToast } = useToast();
  const [targetCategory, setTargetCategory] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTargetCategory(categoriesList[0]?.id ? String(categoriesList[0].id) : '');
      setError('');
    }
  }, [open, categoriesList]);

  const handleExecuteMove = async () => {
    if (!targetCategory) {
      setError('Debes seleccionar una categoría de destino.');
      return;
    }
    
    setMoveLoading(true);
    try {
      await AdminerApi.courseAction({
        action: 'move',
        courseids: coursesToMove,
        categoryid: parseInt(targetCategory, 10)
      });
      addToast({
        type: 'success',
        title: 'Cursos movidos',
        description: `Se movieron ${coursesToMove.length} curso(s) correctamente.`
      });
      onSuccess();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al mover cursos', description: err.message });
    } finally {
      setMoveLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Mover Cursos de Categoría"
      description={`Selecciona la categoría de destino para ${coursesToMove.length} curso(s).`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleExecuteMove} disabled={moveLoading}>
            {moveLoading ? 'Moviendo...' : 'Mover Cursos'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Categoría Destino *</label>
          <Select
            value={targetCategory}
            onChange={(e) => {
              setTargetCategory(e.target.value);
              setError('');
            }}
            className={error ? 'border-red-500' : ''}
          >
            {categoriesList.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      </div>
    </Dialog>
  );
};
