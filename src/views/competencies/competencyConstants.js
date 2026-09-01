import {
  CheckCircle2,
  FileCheck,
  Clock,
  Link as LinkIcon,
  HelpCircle as QuizIcon,
  Sparkles,
  MessageSquare,
  FileText,
  Layers
} from 'lucide-react';

export const RULE_OUTCOMES = [
  {
    value: 3,
    label: 'Marcar completada',
    fullLabel: 'Marcar competencia como completada',
    description: 'Al completar el curso o actividad, la competencia se marca como completada automáticamente.',
    colorClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500'
  },
  {
    value: 1,
    label: 'Adjuntar evidencia',
    fullLabel: 'Adjuntar evidencia de competencia',
    description: 'Al completar el curso o actividad, se adjunta automáticamente evidencia de la competencia.',
    colorClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/20',
    icon: FileCheck,
    dotColor: 'bg-sky-500'
  },
  {
    value: 2,
    label: 'Enviar a revisión',
    fullLabel: 'Enviar competencia a revisión',
    description: 'Al completar el curso o actividad, se envía una solicitud de revisión al docente.',
    colorClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
    icon: Clock,
    dotColor: 'bg-amber-500'
  },
  {
    value: 0,
    label: 'Solo vincular',
    fullLabel: 'Solo vincular (Sin acción automática)',
    description: 'La competencia está asociada para seguimiento, pero no realiza acciones automáticas.',
    colorClass: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
    icon: LinkIcon,
    dotColor: 'bg-muted-foreground'
  }
];

export const getModuleIcon = (modname) => {
  switch (modname?.toLowerCase()) {
    case 'quiz':
      return QuizIcon;
    case 'assign':
      return FileCheck;
    case 'h5pactivity':
    case 'h5p':
      return Sparkles;
    case 'forum':
      return MessageSquare;
    case 'page':
    case 'book':
    case 'lesson':
      return FileText;
    default:
      return Layers;
  }
};

export const getModuleTypeName = (modname) => {
  const map = {
    quiz: 'Cuestionario',
    assign: 'Tarea',
    h5pactivity: 'Contenido H5P',
    h5p: 'Contenido H5P',
    forum: 'Foro',
    page: 'Página',
    book: 'Libro',
    lesson: 'Lección',
    scorm: 'Paquete SCORM',
    url: 'Enlace web',
    feedback: 'Encuesta',
    choice: 'Consulta',
    glossary: 'Glosario',
    resource: 'Recurso / Archivo'
  };
  return map[modname?.toLowerCase()] || modname || 'Actividad';
};
