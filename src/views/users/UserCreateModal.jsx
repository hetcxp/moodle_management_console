import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { useToast } from '../../components/ui/Toast';
import { useAddUser } from '../../hooks/useAdminerQueries';
import { Mail } from 'lucide-react';

export const UserCreateModal = ({ open, onClose, onSuccess }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: performAddUser } = useAddUser();

  const [userForm, setUserForm] = useState({ firstname: '', lastname: '', email: '', username: '', password: '' });
  const [useEmailAsUsername, setUseEmailAsUsername] = useState(false);
  const [createAndSendPassword, setCreateAndSendPassword] = useState(false);
  const [userErrors, setUserErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setUserForm({ firstname: '', lastname: '', email: '', username: '', password: '' });
      setUseEmailAsUsername(false);
      setCreateAndSendPassword(false);
      setUserErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    const newErrors = {};
    if (!userForm.firstname || userForm.firstname.trim().length < 2) {
      newErrors.firstname = 'El nombre debe tener al menos 2 caracteres.';
    }
    if (!userForm.lastname || userForm.lastname.trim().length < 2) {
      newErrors.lastname = 'El apellido debe tener al menos 2 caracteres.';
    }
    if (!userForm.email || !/^\S+@\S+\.\S+$/.test(userForm.email)) {
      newErrors.email = 'Debe ser un email válido.';
    }

    const effectiveUsername = useEmailAsUsername ? userForm.email : userForm.username;
    if (!effectiveUsername || effectiveUsername.trim().length < 3) {
      newErrors.username = 'El usuario debe tener al menos 3 caracteres.';
    }

    if (!createAndSendPassword) {
      if (!userForm.password || userForm.password.length < 6) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
      }
    }

    setUserErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        const result = await performAddUser({
          firstname: userForm.firstname.trim(),
          lastname: userForm.lastname.trim(),
          email: userForm.email.trim(),
          username: effectiveUsername.trim().toLowerCase(),
          password: createAndSendPassword ? '' : userForm.password,
          createpassword: createAndSendPassword ? 1 : 0
        });
        if (result.success) {
          addToast({
            title: 'Usuario Creado',
            description: createAndSendPassword
              ? `Usuario creado con ID: ${result.userid}. Se ha enviado la contraseña por correo.`
              : `ID: ${result.userid}`,
            type: 'success'
          });
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: ['users_kpis'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          onSuccess?.();
          onClose();
        } else {
          addToast({ title: 'Error', description: result.message, type: 'error' });
        }
      } catch (err) {
        addToast({ title: 'Error', description: err.message, type: 'error' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Añadir Nuevo Usuario"
      description="Completa los datos para crear un nuevo usuario en la plataforma."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'Guardando...' : 'Guardar Usuario'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Nombre *</label>
            <Input 
              placeholder="Ej. Juan" 
              value={userForm.firstname} 
              onChange={(e) => setUserForm({...userForm, firstname: e.target.value})}
              className={userErrors.firstname ? 'border-destructive' : ''}
            />
            {userErrors.firstname && <p className="text-xs text-destructive">{userErrors.firstname}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Apellidos *</label>
            <Input 
              placeholder="Ej. Pérez" 
              value={userForm.lastname} 
              onChange={(e) => setUserForm({...userForm, lastname: e.target.value})}
              className={userErrors.lastname ? 'border-destructive' : ''}
            />
            {userErrors.lastname && <p className="text-xs text-destructive">{userErrors.lastname}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">Email *</label>
          <Input 
            type="email" 
            placeholder="juan.perez@ejemplo.com" 
            value={userForm.email} 
            onChange={(e) => {
              const val = e.target.value;
              setUserForm(prev => ({
                ...prev,
                email: val,
                ...(useEmailAsUsername ? { username: val } : {})
              }));
            }}
            className={userErrors.email ? 'border-destructive' : ''}
          />
          {userErrors.email && <p className="text-xs text-destructive">{userErrors.email}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">Nombre de usuario *</label>
          <Input 
            placeholder="juanperez" 
            value={useEmailAsUsername ? userForm.email : userForm.username} 
            disabled={useEmailAsUsername}
            onChange={(e) => setUserForm({...userForm, username: e.target.value})}
            className={`${userErrors.username && !useEmailAsUsername ? 'border-destructive' : ''} ${useEmailAsUsername ? 'bg-muted/60 text-muted-foreground cursor-not-allowed' : ''}`}
          />
          {userErrors.username && !useEmailAsUsername && (
            <p className="text-xs text-destructive">{userErrors.username}</p>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <Checkbox 
              id="use-email-as-username"
              checked={useEmailAsUsername}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setUseEmailAsUsername(isChecked);
                if (isChecked) {
                  setUserForm(prev => ({ ...prev, username: prev.email }));
                  if (userErrors.username) {
                    setUserErrors(prev => ({ ...prev, username: null }));
                  }
                }
              }}
            />
            <label htmlFor="use-email-as-username" className="text-xs text-muted-foreground cursor-pointer select-none">
              Usar el email como nombre de usuario
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">
            Contraseña {!createAndSendPassword && '*'}
          </label>
          {!createAndSendPassword ? (
            <Input 
              type="password" 
              placeholder="Contraseña segura" 
              value={userForm.password} 
              onChange={(e) => setUserForm({...userForm, password: e.target.value})}
              className={userErrors.password ? 'border-destructive' : ''}
            />
          ) : (
            <div className="p-3 bg-muted/40 rounded-lg border border-border/60 text-xs text-muted-foreground flex items-start gap-2.5">
              <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Se generará una contraseña segura automáticamente y se enviará por correo electrónico con las instrucciones de acceso.</span>
            </div>
          )}
          {userErrors.password && !createAndSendPassword && (
            <p className="text-xs text-destructive">{userErrors.password}</p>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <Checkbox 
              id="create-and-send-password"
              checked={createAndSendPassword}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setCreateAndSendPassword(isChecked);
                if (isChecked && userErrors.password) {
                  setUserErrors(prev => ({ ...prev, password: null }));
                }
              }}
            />
            <label htmlFor="create-and-send-password" className="text-xs text-muted-foreground cursor-pointer select-none">
              Crear y enviar la contraseña al usuario por correo
            </label>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
