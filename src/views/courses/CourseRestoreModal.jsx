import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  UploadCloud, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  FileArchive, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { AdminerApi } from '../../services/adminer-api';
import { useRestoreCourseMbz } from '../../hooks/queries/useCourseQueries';

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

export const CourseRestoreModal = ({ open, onClose, onSuccess, categoriesList = [], defaultCategoryId }) => {
  const { addToast } = useToast();
  const { mutateAsync: restoreCourseMutation } = useRestoreCourseMbz();
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState('upload'); // 'upload' | 'server'
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [serverBackups, setServerBackups] = useState([]);
  const [loadingServerBackups, setLoadingServerBackups] = useState(false);
  const [selectedServerBackup, setSelectedServerBackup] = useState(null);

  const [categoryid, setCategoryid] = useState('');
  const [fullname, setFullname] = useState('');
  const [shortname, setShortname] = useState('');

  const [phase, setPhase] = useState('idle'); // 'idle' | 'uploading' | 'restoring' | 'done' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [showWarnings, setShowWarnings] = useState(false);
  const [restoredCourse, setRestoredCourse] = useState(null);

  const fetchServerBackups = useCallback(async () => {
    setLoadingServerBackups(true);
    try {
      const data = await AdminerApi.getAvailableServerBackups();
      setServerBackups(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error listando backups',
        description: err.message || 'No se pudieron consultar los backups del servidor.'
      });
    } finally {
      setLoadingServerBackups(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (open) {
      setTab('upload');
      setFile(null);
      setIsDragging(false);
      setUploadProgress(0);
      setSelectedServerBackup(null);
      setCategoryid(defaultCategoryId ? String(defaultCategoryId) : (categoriesList[0]?.id ? String(categoriesList[0].id) : '1'));
      setFullname('');
      setShortname('');
      setPhase('idle');
      setErrorMsg('');
      setWarnings([]);
      setShowWarnings(false);
      setRestoredCourse(null);
      fetchServerBackups();
    }
  }, [open, defaultCategoryId, categoriesList, fetchServerBackups]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.toLowerCase().endsWith('.mbz')) {
        setFile(droppedFile);
      } else {
        addToast({
          type: 'error',
          title: 'Archivo no válido',
          description: 'Solo se admiten archivos con extensión .mbz'
        });
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.name.toLowerCase().endsWith('.mbz')) {
        setFile(selected);
      } else {
        addToast({
          type: 'error',
          title: 'Archivo no válido',
          description: 'Solo se admiten archivos con extensión .mbz'
        });
      }
    }
  };

  const handleRestore = async (e) => {
    if (e) e.preventDefault();

    if (!categoryid) {
      addToast({
        type: 'error',
        title: 'Campo requerido',
        description: 'Debes seleccionar una categoría de destino.'
      });
      return;
    }

    if (tab === 'upload' && !file) {
      addToast({
        type: 'error',
        title: 'Archivo requerido',
        description: 'Debes seleccionar o arrastrar un archivo .mbz.'
      });
      return;
    }

    if (tab === 'server' && !selectedServerBackup) {
      addToast({
        type: 'error',
        title: 'Backup requerido',
        description: 'Debes seleccionar un archivo de copia de seguridad del servidor.'
      });
      return;
    }

    setErrorMsg('');
    setWarnings([]);

    try {
      let backupPath = '';

      if (tab === 'upload') {
        setPhase('uploading');
        setUploadProgress(0);
        const uploadResult = await AdminerApi.uploadMbzFile(file, (progress) => {
          setUploadProgress(progress);
        });
        backupPath = uploadResult.tempfile;
      } else {
        backupPath = selectedServerBackup.path;
      }

      setPhase('restoring');

      const result = await restoreCourseMutation({
        backupfile: backupPath,
        categoryid: parseInt(categoryid, 10),
        fullname: fullname.trim(),
        shortname: shortname.trim()
      });

      setRestoredCourse(result);
      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
      }
      setPhase('done');

      addToast({
        type: 'success',
        title: 'Curso restaurado con éxito',
        description: `El curso "${result.fullname || 'Restaurado'}" ha sido creado en Moodle.`
      });

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setPhase('error');
      setErrorMsg(err.message || 'Ocurrió un error inesperado al restaurar el curso.');
      addToast({
        type: 'error',
        title: 'Fallo al restaurar',
        description: err.message || 'Error en el proceso de restauración.'
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (phase !== 'uploading' && phase !== 'restoring') {
          onClose();
        }
      }}
      title="Restaurar Curso desde MBZ"
      description="Restaura un curso completo a partir de un archivo de backup .mbz con todas sus actividades y secciones."
      footer={
        phase === 'done' ? (
          <Button onClick={onClose} className="w-full sm:w-auto">
            Cerrar
          </Button>
        ) : (
          <>
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={phase === 'uploading' || phase === 'restoring'}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleRestore} 
              disabled={
                phase === 'uploading' || 
                phase === 'restoring' || 
                (tab === 'upload' && !file) || 
                (tab === 'server' && !selectedServerBackup)
              }
              className="gap-2"
            >
              {phase === 'uploading' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo ({uploadProgress}%)
                </>
              )}
              {phase === 'restoring' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restaurando en Moodle...
                </>
              )}
              {phase === 'error' && (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Reintentar Restauración
                </>
              )}
              {phase === 'idle' && 'Restaurar Curso'}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-5">
        {/* State Banners: Done or Error */}
        {phase === 'done' && restoredCourse && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">¡Curso restaurado correctamente!</h4>
                <p className="text-xs text-emerald-200">
                  El curso está listo y disponible en la plataforma.
                </p>
              </div>
            </div>

            <div className="text-xs bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/10 space-y-1">
              <div><strong>Nombre:</strong> {restoredCourse.fullname}</div>
              <div><strong>Nombre Corto:</strong> {restoredCourse.shortname}</div>
              <div><strong>ID de Curso:</strong> {restoredCourse.courseid}</div>
            </div>

            {restoredCourse.url && (
              <a
                href={restoredCourse.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline pt-1"
              >
                Abrir curso en Moodle <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {warnings.length > 0 && (
              <div className="pt-2 border-t border-emerald-500/20">
                <button
                  type="button"
                  onClick={() => setShowWarnings(!showWarnings)}
                  className="flex items-center justify-between w-full text-xs text-amber-300 hover:text-amber-200 font-medium"
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {warnings.length} advertencia(s) no bloqueante(s)
                  </span>
                  {showWarnings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showWarnings && (
                  <ul className="mt-2 space-y-1 text-[11px] text-amber-200/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20 max-h-36 overflow-y-auto">
                    {warnings.map((w, idx) => (
                      <li key={idx} className="list-disc list-inside">
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {phase === 'error' && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive space-y-2">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h4 className="font-semibold text-sm">Error en la restauración</h4>
            </div>
            <p className="text-xs text-destructive/90">{errorMsg}</p>
          </div>
        )}

        {/* Form Body (hidden only when done) */}
        {phase !== 'done' && (
          <>
            {/* Mode selection tabs */}
            <div className="flex p-1 bg-surface-2/60 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setTab('upload')}
                disabled={phase === 'uploading' || phase === 'restoring'}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'upload'
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <UploadCloud className="h-4 w-4" />
                Subir Archivo MBZ
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('server');
                  if (serverBackups.length === 0) fetchServerBackups();
                }}
                disabled={phase === 'uploading' || phase === 'restoring'}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'server'
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <Server className="h-4 w-4" />
                Archivos en Servidor
              </button>
            </div>

            {/* Tab 1: Upload */}
            {tab === 'upload' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mbz"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (phase !== 'uploading' && phase !== 'restoring' && fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/10'
                      : file
                      ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60'
                      : 'border-white/10 hover:border-white/20 bg-surface-2/40'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    {file ? (
                      <>
                        <FileArchive className="h-8 w-8 text-emerald-400" />
                        <div className="text-xs font-medium text-foreground">{file.name}</div>
                        <div className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</div>
                        <span className="text-[10px] text-primary hover:underline mt-1">
                          Hacer clic para cambiar de archivo
                        </span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                        <div className="text-xs font-semibold text-foreground">
                          Arrastra tu archivo <span className="text-primary">.mbz</span> aquí
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          o haz clic para examinar desde tu equipo
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar during upload */}
                {phase === 'uploading' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                      <span>Subiendo archivo al servidor...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="bg-primary h-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Server backups */}
            {tab === 'server' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Backups disponibles en el servidor
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchServerBackups}
                    disabled={loadingServerBackups}
                    className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loadingServerBackups ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>

                {loadingServerBackups ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-white/5 rounded-xl bg-surface-2/20">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Buscando archivos en el directorio scratch...
                  </div>
                ) : serverBackups.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-white/10 rounded-xl bg-surface-2/20">
                    No se encontraron archivos .mbz en la carpeta scratch del servidor.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {serverBackups.map((backup) => {
                      const isSelected = selectedServerBackup?.path === backup.path;
                      return (
                        <div
                          key={backup.path}
                          onClick={() => {
                            if (phase !== 'uploading' && phase !== 'restoring') {
                              setSelectedServerBackup(backup);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-white shadow-sm'
                              : 'border-white/5 bg-surface-2/40 hover:bg-surface-2/70 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <FileArchive className={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                            <div className="truncate">
                              <div className={`font-medium truncate ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                {backup.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground/80">
                                {formatDate(backup.date)}
                              </div>
                            </div>
                          </div>
                          <div className="text-[11px] font-mono shrink-0 pl-2">
                            {formatBytes(backup.size)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Destination Settings */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Categoría de destino *
                </label>
                <Select
                  value={categoryid}
                  onChange={(e) => setCategoryid(e.target.value)}
                  disabled={phase === 'uploading' || phase === 'restoring'}
                >
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Nombre Completo (Opcional)
                  </label>
                  <Input
                    placeholder="Se usará el del backup si se omite"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    disabled={phase === 'uploading' || phase === 'restoring'}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Nombre Corto (Opcional)
                  </label>
                  <Input
                    placeholder="Generado automáticamente si se omite"
                    value={shortname}
                    onChange={(e) => setShortname(e.target.value)}
                    disabled={phase === 'uploading' || phase === 'restoring'}
                  />
                </div>
              </div>
            </div>

            {/* In-progress status notification */}
            {phase === 'restoring' && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3 text-xs text-primary">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Descomprimiendo backup y restaurando curso en Moodle... Por favor espera.</span>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
};
