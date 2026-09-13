/**
 * Registro central de ayuda contextual por vista.
 * Cada clave corresponde a un viewId o tab activo.
 */

export const helpRegistry = {
  dashboard: {
    title: 'Panel de Control',
    summary: 'Métricas generales, salud de la plataforma y accesos rápidos a la gestión institucional.',
    actions: [
      {
        name: 'Actualizar Métricas',
        description: 'Recarga los indicadores en tiempo real desde la base de datos de Moodle.',
        requiredRole: 'Acceso General de Consulta'
      },
      {
        name: 'Navegación Rápida',
        description: 'Accede directamente a la gestión de cursos, usuarios, categorías y reportes.',
        requiredRole: 'Acceso General de Consulta'
      }
    ],
    kpisHelp: {
      'Cursos': 'Cursos activos vs. ocultos en el catálogo general.',
      'Usuarios': 'Usuarios registrados con estado activo frente a cuentas suspendidas.',
      'Cohortes': 'Grupos globales del sitio y alumnos asignados a cohortes.',
      'Categorías': 'Estructura organizativa activa para clasificar cursos.',
      'Tasa de Actividad': 'Porcentaje de usuarios registrados que han iniciado sesión recientemente.',
      'Cohortes Vacíos': 'Grupos globales sin estudiantes asignados que requieren revisión.',
      'Competencias': 'Marcos de aprendizaje configurados en la plataforma.'
    },
    workflows: [
      {
        title: 'Monitoreo de Salud de la Plataforma',
        steps: [
          'Revisar la tasa de actividad y usuarios inactivos en el resumen.',
          'Verificar cohortes vacíos antes del inicio de los períodos lectivos.',
          'Acceder a las secciones específicas desde las tarjetas de métricas para tomar acciones.'
        ]
      }
    ]
  },
  courses: {
    title: 'Gestión de Cursos',
    summary: 'Administración del catálogo curricular: búsqueda, filtros de visibilidad, creación y operaciones masivas.',
    actions: [
      {
        name: 'Crear Curso',
        description: 'Añade un nuevo curso al catálogo especificando nombre, código y categoría.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      },
      {
        name: 'Importar CSV',
        description: 'Carga masiva de cursos mediante plantilla estructurada CSV.',
        requiredRole: 'Administrador del Sitio'
      },
      {
        name: 'Exportar CSV',
        description: 'Descarga en hoja de cálculo el listado de cursos según los filtros activos.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      },
      {
        name: 'Operaciones Masivas',
        description: 'Selecciona múltiples cursos para ocultar, mostrar, mover de categoría o eliminar en bloque.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      }
    ],
    kpisHelp: {
      'Total Cursos': 'Número total de cursos existentes en la plataforma.',
      'Alumnos Enrolados': 'Matrículas activas de estudiantes registradas en cursos.',
      'Progreso Promedio': 'Porcentaje general de avance de los estudiantes en sus cursos.',
      'Cursos Vacíos': 'Cursos que no cuentan con ningún estudiante matriculado.'
    },
    workflows: [
      {
        title: 'Publicación Masiva de Cursos',
        steps: [
          'Filtra los cursos por categoría y estado "Solo Ocultos".',
          'Selecciona los cursos requeridos con las casillas de verificación.',
          'Usa la barra de acciones masivas para cambiar la visibilidad a "Visible".'
        ]
      },
      {
        title: 'Carga por Lote vía CSV',
        steps: [
          'Haz clic en "Importar CSV" en la barra de herramientas.',
          'Sube el archivo CSV con las columnas mínimas requeridas.',
          'Valida la previsualización y confirma la importación.'
        ]
      }
    ]
  },
  'courses-detail': {
    title: 'Detalle del Curso',
    summary: 'Gestión integral del curso: estudiantes matriculados, asignación de grupos y vinculación de competencias.',
    actions: [
      {
        name: 'Matricular Estudiante',
        description: 'Asigna nuevos usuarios al curso con rol de estudiante o profesor.',
        requiredRole: 'Profesor / Editor de Curso'
      },
      {
        name: 'Desmatricular',
        description: 'Elimina la matrícula de un usuario en el curso conservando su historial.',
        requiredRole: 'Profesor / Editor de Curso'
      },
      {
        name: 'Vincular Competencias',
        description: 'Asocia competencias del marco institucional a los resultados del curso.',
        requiredRole: 'Profesor / Gestor de Plataforma'
      }
    ],
    workflows: [
      {
        title: 'Gestión de Alumnos en Curso',
        steps: [
          'Navega a la pestaña "Usuarios Matriculados".',
          'Filtra por rol o estado de completitud.',
          'Añade o retira matrículas según necesidad académica.'
        ]
      }
    ]
  },
  'course-user-detail': {
    title: 'Usuario en Curso',
    summary: 'Supervisión individual del alumno en el curso: progreso curricular, estado de matrícula, calificaciones por actividad y registro de acceso.',
    actions: [
      {
        name: 'Mensaje',
        description: 'Envía una comunicación interna directa al estudiante en la plataforma.',
        requiredRole: 'Profesor / Editor de Curso'
      },
      {
        name: 'Expiración',
        description: 'Configura, modifica o remueve la fecha de vigencia de la matrícula en este curso.',
        requiredRole: 'Profesor / Editor de Curso'
      },
      {
        name: 'Suspender / Activar',
        description: 'Pausa o reactiva el acceso del estudiante al curso sin eliminar sus notas, entregas ni historial.',
        requiredRole: 'Profesor / Editor de Curso'
      },
      {
        name: 'Desmatricular',
        description: 'Elimina de forma permanente la matrícula del alumno en este curso.',
        requiredRole: 'Profesor / Editor de Curso'
      }
    ],
    workflows: [
      {
        title: 'Seguimiento Académico y Retroalimentación',
        steps: [
          'Revisa el progreso general y la lista de actividades en la pestaña "Desempeño y Actividades".',
          'Identifica tareas o cuestionarios incompletos o con calificación no superada.',
          'Utiliza el botón "Mensaje" para comunicarte directamente con el estudiante y acordar soporte.'
        ]
      },
      {
        title: 'Ajuste de Matrícula y Fechas Límite',
        steps: [
          'Consulta el método y fechas de inscripción en la pestaña "Auditoría de Acceso".',
          'Haz clic en "Expiración" para definir o ampliar el plazo de acceso del estudiante.',
          'Aplica "Suspender" si requieres congelar el acceso temporalmente manteniendo su progreso.'
        ]
      }
    ]
  },
  categories: {
    title: 'Categorías de Cursos',
    summary: 'Estructura organizativa jerárquica para clasificar los cursos y delegar permisos en la plataforma.',
    actions: [
      {
        name: 'Crear Categoría',
        description: 'Añade una nueva categoría o subcategoría definiendo su nivel padre.',
        requiredRole: 'Gestor de Categoría / Administrador'
      },
      {
        name: 'Visibilidad',
        description: 'Oculta o muestra una categoría completa afectando a sus subelementos según configuración.',
        requiredRole: 'Gestor de Categoría / Administrador'
      },
      {
        name: 'Operaciones Masivas',
        description: 'Selecciona varias categorías para visibilidad o reorganización en lote.',
        requiredRole: 'Gestor de Categoría / Administrador'
      }
    ],
    kpisHelp: {
      'Total Categorías': 'Ramas organizativas totales registradas en el sitio.',
      'Cursos Asignados': 'Total de cursos ubicados dentro del árbol de categorías.',
      'Visibles': 'Categorías accesibles en el catálogo público de la plataforma.',
      'Ocultas': 'Categorías en preparación o archivadas no visibles para los estudiantes.'
    },
    workflows: [
      {
        title: 'Reorganización del Árbol de Categorías',
        steps: [
          'Identifica la categoría de destino en la estructura.',
          'Crea subcategorías si se requiere mayor granularidad temática o departamental.',
          'Mueve cursos seleccionados a su nueva rama correspondiente.'
        ]
      }
    ]
  },
  'categories-detail': {
    title: 'Detalle de Categoría',
    summary: 'Exploración de subcategorías y cursos asociados directamente a esta rama curricular.',
    actions: [
      {
        name: 'Nueva Subcategoría',
        description: 'Crea un subnivel jerárquico dentro de esta categoría.',
        requiredRole: 'Gestor de Categoría'
      },
      {
        name: 'Mover Cursos',
        description: 'Reubica cursos contenidos hacia otras categorías del árbol.',
        requiredRole: 'Gestor de Categoría / Administrador'
      }
    ],
    workflows: [
      {
        title: 'Gestión Interna de la Categoría',
        steps: [
          'Revisa la lista de subcategorías y cursos asignados.',
          'Ajusta visibilidad o asignación según el ciclo académico.'
        ]
      }
    ]
  },
  cohorts: {
    title: 'Gestión de Cohortes',
    summary: 'Grupos globales a nivel de sitio o categoría utilizados para matriculaciones masivas en cursos.',
    actions: [
      {
        name: 'Crear Cohorte',
        description: 'Define una nueva agrupación institucional por programa, sede o período.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      },
      {
        name: 'Asignación Masiva',
        description: 'Matricula todos los integrantes de una cohorte a cursos simultáneamente.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      },
      {
        name: 'Exportar',
        description: 'Descarga en CSV la relación de cohortes y conteo de miembros.',
        requiredRole: 'Acceso General de Consulta'
      }
    ],
    kpisHelp: {
      'Total Cohortes': 'Número de grupos globales activos en la plataforma.',
      'Total Miembros': 'Total de alumnos vinculados a alguna de las cohortes.',
      'Cohortes Vacías': 'Grupos creados que aún no cuentan con estudiantes asignados.',
      'Promedio por Cohorte': 'Media de estudiantes agrupados por cohorte.'
    },
    workflows: [
      {
        title: 'Creación y Enrolamiento por Cohorte',
        steps: [
          'Crea la cohorte con código institucional único.',
          'Asigna los estudiantes desde la vista de miembros.',
          'Vincula la cohorte al método de sincronización en los cursos destino.'
        ]
      }
    ]
  },
  'cohorts-detail': {
    title: 'Detalle de Cohorte',
    summary: 'Administración de integrantes de la cohorte y cursos donde se encuentra sincronizada.',
    actions: [
      {
        name: 'Agregar Miembros',
        description: 'Incorpora usuarios de la plataforma a esta agrupación.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      },
      {
        name: 'Remover Miembros',
        description: 'Desvincula usuarios de la cohorte sin eliminar sus cuentas de usuario.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      }
    ],
    workflows: [
      {
        title: 'Actualización de Membresías',
        steps: [
          'Navega a la pestaña de miembros.',
          'Busca los usuarios a incorporar o desvincular.',
          'Aplica los cambios confirmando la sincronización en cursos vinculados.'
        ]
      }
    ]
  },
  users: {
    title: 'Gestión de Usuarios',
    summary: 'Directorio de usuarios: estados de cuenta, asignación masiva, importación por CSV y auditoría de accesos.',
    actions: [
      {
        name: 'Añadir Usuario',
        description: 'Registra una cuenta de usuario manual definiendo credenciales y datos básicos.',
        requiredRole: 'Administrador del Sitio'
      },
      {
        name: 'Cargar CSV',
        description: 'Importación masiva de cuentas mediante archivo delimitado por comas.',
        requiredRole: 'Administrador del Sitio'
      },
      {
        name: 'Operaciones Masivas',
        description: 'Suspender, activar o restablecer contraseñas para múltiples usuarios seleccionados.',
        requiredRole: 'Administrador del Sitio'
      },
      {
        name: 'Exportar CSV',
        description: 'Descarga la lista de usuarios según los filtros y estados activos.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      }
    ],
    kpisHelp: {
      'Total Usuarios': 'Número total de cuentas de usuario existentes en el sistema.',
      'Activos': 'Cuentas habilitadas con permiso para iniciar sesión.',
      'Suspendidos': 'Cuentas temporalmente deshabilitadas sin acceso a la plataforma.',
      'Progreso Promedio': 'Media general de cursos completados por los usuarios.'
    },
    workflows: [
      {
        title: 'Gestión de Cuentas y Seguridad',
        steps: [
          'Filtra por estado "Solo Suspendidos" o busca cuentas inactivas.',
          'Aplica acciones masivas para reactivar o suspender según políticas de seguridad.',
          'Genera contraseñas temporales para usuarios con dificultades de acceso.'
        ]
      },
      {
        title: 'Alta Masiva de Usuarios',
        steps: [
          'Haz clic en "Cargar CSV" en la barra de herramientas.',
          'Prepara el archivo con los encabezados requeridos (username, firstname, lastname, email).',
          'Valida los registros importados y confirma la creación.'
        ]
      }
    ]
  },
  'users-detail': {
    title: 'Detalle de Usuario',
    summary: 'Ficha integral del usuario: información de perfil, historial de cursos, membresías en cohortes y competencias.',
    actions: [
      {
        name: 'Suspender / Activar',
        description: 'Modifica el estado de acceso de la cuenta inmediatamente.',
        requiredRole: 'Administrador del Sitio'
      },
      {
        name: 'Contraseña Temporal',
        description: 'Genera y envía una clave de acceso temporal al correo del usuario.',
        requiredRole: 'Administrador del Sitio'
      },
      {
        name: 'Vincular Cursos',
        description: 'Matricula directamente al usuario en uno o varios cursos.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      },
      {
        name: 'Asignar Cohortes',
        description: 'Añade al usuario a grupos globales del sitio.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      }
    ],
    workflows: [
      {
        title: 'Revisión y Ajuste de Matrículas del Usuario',
        steps: [
          'Selecciona la pestaña "Cursos".',
          'Examina el avance porcentual y estado de cada curso.',
          'Utiliza los botones de acción para enrolar o ajustar rol.'
        ]
      }
    ]
  },
  competencies: {
    title: 'Marcos de Competencias',
    summary: 'Gestión de marcos curriculares, escalas de evaluación y estándares de logro institucional.',
    actions: [
      {
        name: 'Crear Marco',
        description: 'Configura una nueva estructura de competencias y asocia su escala de calificación.',
        requiredRole: 'Administrador del Sitio'
      },
      {
        name: 'Revisiones Pendientes',
        description: 'Consulta las solicitudes de evaluación de evidencias enviadas por los estudiantes.',
        requiredRole: 'Profesor / Gestor de Plataforma'
      },
      {
        name: 'Visibilidad de Marcos',
        description: 'Habilita o desactiva la disponibilidad del marco para su vinculación en cursos.',
        requiredRole: 'Administrador del Sitio'
      }
    ],
    kpisHelp: {
      'Marcos de Competencias': 'Total de estructuras curriculares registradas.',
      'Total Competencias': 'Suma de competencias y subcompetencias en todos los marcos.',
      'Visibles': 'Marcos activos y disponibles para asociar en actividades y cursos.',
      'Revisiones Pendientes': 'Evidencias de estudiantes que aguardan calificación de un docente.'
    },
    workflows: [
      {
        title: 'Configuración de Marco de Competencias',
        steps: [
          'Crea el marco asignando código y escala de calificación.',
          'Accede al detalle para estructurar el árbol jerárquico de competencias.',
          'Vincula el marco a los cursos o programas académicos.'
        ]
      }
    ]
  },
  'competency-framework-detail': {
    title: 'Marco de Competencias',
    summary: 'Árbol jerárquico de competencias: reglas de superación, escalas y cursos vinculados.',
    actions: [
      {
        name: 'Agregar Competencia',
        description: 'Añade un estándar hijo o regla de calificación al árbol del marco.',
        requiredRole: 'Administrador del Sitio'
      },
      {
        name: 'Editar Regla de Superación',
        description: 'Define si la competencia requiere evaluación docente o completitud de hijos.',
        requiredRole: 'Administrador del Sitio'
      }
    ],
    workflows: [
      {
        title: 'Estructuración del Árbol',
        steps: [
          'Selecciona la competencia padre en el árbol jerárquico.',
          'Haz clic en agregar competencia hija y define su código.',
          'Configura el identificador y método de calificación.'
        ]
      }
    ]
  },
  'competency-detail': {
    title: 'Detalle de Competencia',
    summary: 'Evidencias individuales, registro de calificaciones y vinculación directa a actividades de cursos.',
    actions: [
      {
        name: 'Calificar Evidencia',
        description: 'Asigna un nivel de logro al estudiante según la escala configurada.',
        requiredRole: 'Profesor / Evaluador'
      },
      {
        name: 'Ver Cursos Relacionados',
        description: 'Revisa qué cursos tienen asignada esta competencia como resultado de aprendizaje.',
        requiredRole: 'Profesor / Gestor'
      }
    ],
    workflows: [
      {
        title: 'Evaluación de Evidencias',
        steps: [
          'Revisa la evidencia remitida por el estudiante.',
          'Aplica el nivel de logro correspondiente en la escala.',
          'Confirma la calificación para actualizar el progreso del estudiante.'
        ]
      }
    ]
  },
  scales: {
    title: 'Escalas de Evaluación',
    summary: 'Catálogo y administración de escalas de calificación estándar y personalizadas de Moodle para cursos, actividades y competencias.',
    actions: [
      {
        name: 'Nueva Escala',
        description: 'Crea una nueva escala personalizada especificando nombre y niveles ordenados de menor a mayor.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      },
      {
        name: 'Editar Escala',
        description: 'Modifica los nombres de los niveles de evaluación de escalas que no posean calificaciones registradas.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      },
      {
        name: 'Eliminar Escala',
        description: 'Elimina escalas personalizadas que no estén asignadas a marcos de competencias ni tengan notas asociadas.',
        requiredRole: 'Administrador del Sitio'
      }
    ],
    kpisHelp: {
      'Total Escalas': 'Número total de escalas de calificación configuradas en la plataforma.',
      'En Uso en Marcos': 'Escalas asociadas activamente a uno o más marcos de competencias.',
      'Escalas Bloqueadas': 'Escalas con calificaciones registradas que protegen su histórico contra modificaciones.',
      'Niveles Promedio': 'Cantidad promedio de niveles o criterios de evaluación configurados por escala.'
    },
    workflows: [
      {
        title: 'Creación de Escala de Calificación',
        steps: [
          'Haz clic en "Nueva Escala" en la barra de herramientas.',
          'Define el nombre identificativo de la escala.',
          'Ingresa los niveles separados por comas, desde el nivel más bajo al más alto (ej. No competente, Competente).',
          'Guarda los cambios para que quede disponible en cursos y marcos.'
        ]
      }
    ]
  },
  reports: {
    title: 'Generador de Reportes',
    summary: 'Centro de exportación y análisis: métricas agregadas por cursos, usuarios, categorías y cohortes.',
    actions: [
      {
        name: 'Exportar CSV Rápido',
        description: 'Descarga directamente el conjunto de datos de la entidad en formato tabular.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      },
      {
        name: 'Reporte Personalizado',
        description: 'Abre el modal de configuración de columnas y filtros avanzados.',
        requiredRole: 'Gestor de Plataforma / Administrador'
      }
    ],
    workflows: [
      {
        title: 'Auditoría y Exportación Periódica',
        steps: [
          'Selecciona la entidad a auditar (Cursos, Usuarios, Categorías o Cohortes).',
          'Abre el detalle para filtrar por período o estado.',
          'Descarga el archivo CSV consolidado para análisis institucional.'
        ]
      }
    ]
  }
};
