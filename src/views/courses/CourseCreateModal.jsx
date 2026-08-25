import React, { useState, useEffect } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { AdminerApi } from '../../services/adminer-api';

export const CourseCreateModal = ({ open, onClose, onSuccess, categoriesList, defaultCategoryId }) => {
  const { addToast } = useToast();
  const [createLoading, setCreateLoading] = useState(false);
  
  const [form, setForm] = useState({
    fullname: '',
    shortname: '',
    categoryid: '',
    summary: '',
    visible: 1,
    startdate: '',
    enddate: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        fullname: '',
        shortname: '',
        categoryid: defaultCategoryId ? String(defaultCategoryId) : (categoriesList[0]?.id ? String(categoriesList[0].id) : ''),
        summary: '',
        visible: 1,
        startdate: '',
        enddate: ''
      });
      setErrors({});
    }
  }, [open, categoriesList]);

  const validate = () => {
    const newErrors = {};
    if (!form.fullname || form.fullname.trim().length < 3) {
      newErrors.fullname = 'El nombre completo debe tener al menos 3 caracteres.';
    }
    if (!form.shortname || form.shortname.trim().length < 2) {
      newErrors.shortname = 'El nombre corto debe tener al menos 2 caracteres.';
    }
    if (!form.categoryid) {
      newErrors.categoryid = 'Debes seleccionar una categoría.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setCreateLoading(true);
    try {
      await AdminerApi.courseAction({
        action: 'create',
        fullname: form.fullname,
        shortname: form.shortname,
        categoryid: parseInt(form.categoryid, 10),
        summary: form.summary,
        visible: parseInt(form.visible, 10),
        startdate: form.startdate ? (new Date(form.startdate).getTime() / 1000) : 0,
        enddate: form.enddate ? (new Date(form.enddate).getTime() / 1000) : 0
      });
      addToast({
        type: 'success',
        title: 'Curso creado',
        description: `El curso "${form.fullname}" fue creado con éxito.`
      });
      onSuccess();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al crear curso', description: err.message });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Crear Nuevo Curso"
      description="Ingresa los datos para registrar un curso en Moodle."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleCreateCourse} disabled={createLoading}>
            {createLoading ? 'Creando...' : 'Crear Curso'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleCreateCourse} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Nombre Completo del Curso *</label>
          <Input
            placeholder="Ej: Introducción a Python 3"
            value={form.fullname}
            onChange={(e) => setForm({ ...form, fullname: e.target.value })}
            className={errors.fullname ? 'border-red-500' : ''}
          />
          {errors.fullname && <p className="text-xs text-red-500 mt-1">{errors.fullname}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre Corto / Código *</label>
            <Input
              placeholder="Ej: PY3-101"
              value={form.shortname}
              onChange={(e) => setForm({ ...form, shortname: e.target.value })}
              className={errors.shortname ? 'border-red-500' : ''}
            />
            {errors.shortname && <p className="text-xs text-red-500 mt-1">{errors.shortname}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Categoría *</label>
            <Select
              value={form.categoryid}
              onChange={(e) => setForm({ ...form, categoryid: e.target.value })}
              className={errors.categoryid ? 'border-red-500' : ''}
            >
              {categoriesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errors.categoryid && <p className="text-xs text-red-500 mt-1">{errors.categoryid}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Visibilidad Inicial</label>
          <Select
            value={form.visible}
            onChange={(e) => setForm({ ...form, visible: parseInt(e.target.value, 10) })}
          >
            <option value={1}>Visible para estudiantes</option>
            <option value={0}>Oculto (Borrador)</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Fecha de Inicio</label>
            <Input
              type="date"
              value={form.startdate}
              onChange={(e) => setForm({ ...form, startdate: e.target.value })}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Fecha de Fin</label>
            <Input
              type="date"
              value={form.enddate}
              onChange={(e) => setForm({ ...form, enddate: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Resumen / Descripción</label>
          <textarea
            className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Descripción breve del contenido del curso..."
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </div>
      </form>
    </Dialog>
  );
};
