/**
 * Diccionario centralizado de literales para modales de reportes
 * Facilita la futura implementación de internacionalización (i18n).
 */
export const I18N = {
  reports: {
    category: {
      title: "Reporte Detallado de Categorías",
      description: "Selecciona las categorías para exportar un reporte con los cursos asociados y su avance promedio.",
      emptyTitle: "Sin categorías",
      emptyMessage: "No se encontraron categorías en el sistema.",
      filename: "detalle_categorias",
      columns: {
        categoryName: "Nombre de Categoría",
        courseName: "Nombre del Curso",
        courseStatus: "Estado del Curso",
        enrolled: "Usuarios Matriculados",
        completed: "Usuarios Completados",
        progress: "Progreso Promedio %"
      },
      strings: {
        visible: "Visible",
        hidden: "Oculto"
      }
    },
    course: {
      title: "Reporte Detallado de Cursos",
      description: "Selecciona los cursos para exportar el detalle de usuarios, métodos de matrícula y progreso.",
      emptyTitle: "Sin resultados",
      emptyMessage: "No se encontraron cursos con los filtros actuales.",
      filename: "detalle_cursos",
      columns: {
        category: "Categoría",
        course: "Curso",
        user: "Usuario",
        role: "Rol",
        progress: "Progreso %",
        status: "Estado",
        method: "Método Matriculación",
        startDate: "Fecha Inicio",
        endDate: "Fecha Fin"
      },
      strings: {
        allCategories: "Todas las categorías",
        unknown: "Desconocida",
        noUsers: "Sin usuarios matriculados",
        active: "Activo",
        suspended: "Suspendido"
      }
    },
    user: {
      title: "Reporte Detallado de Usuarios",
      description: "Selecciona usuarios para exportar el detalle de los cursos en los que están matriculados.",
      emptyTitle: "Sin resultados",
      emptyMessage: "No se encontraron usuarios con los filtros actuales.",
      filename: "detalle_usuarios",
      columns: {
        user: "Nombre de Usuario",
        email: "Email",
        course: "Curso",
        progress: "Progreso %",
        method: "Método Matriculación",
        status: "Estado de Matrícula",
        startDate: "Fecha Inicio",
        endDate: "Fecha Fin"
      },
      strings: {
        allCohorts: "Todas las cohortes",
        unknownMethod: "Desconocido",
        noCourses: "Sin cursos matriculados",
        active: "Activo",
        suspended: "Suspendido"
      }
    },
    cohort: {
      title: "Reporte Detallado de Cohortes",
      description: "Selecciona cohortes para exportar el detalle de sus miembros, cursos vinculados y progreso individual.",
      emptyTitle: "Sin resultados",
      emptyMessage: "No se encontraron cohortes con los filtros actuales.",
      filename: "detalle_cohortes",
      columns: {
        cohortName: "Nombre Cohorte",
        cohortCode: "Código Cohorte",
        userName: "Nombre del Usuario",
        email: "Email",
        userStatus: "Estado del Usuario",
        course: "Curso",
        progress: "Progreso en el Curso %"
      },
      strings: {
        noMembers: "Sin miembros",
        noCourses: "Sin cursos vinculados",
        active: "Activo",
        suspended: "Suspendido",
        members: "miembros",
        courses: "cursos"
      }
    },
    dashboard: {
      title: "Dashboard de Reportería",
      subtitle: "Descarga la información de la plataforma en formato CSV.",
      buttons: {
        summary: "Resumen",
        detailCourse: "Detalle de Curso",
        detailCategory: "Detalle de Categoría",
        detailUser: "Detalle de Usuario",
        detailCohort: "Detalle de Cohorte"
      },
      messages: {
        noData: "No hay datos para exportar en este reporte",
        success: "Reporte descargado con éxito",
        error: "Error al generar el reporte"
      },
      reports: {
        courses: {
          title: "Directorio de Cursos",
          description: "Exporta la lista completa de cursos o detalla el progreso de los usuarios inscritos por curso.",
          columns: {
            fullname: "Nombre Completo",
            shortname: "Nombre Corto",
            category: "Categoría",
            status: "Estado",
            enrolled: "Matriculados",
            progress: "Progreso Promedio %"
          }
        },
        categories: {
          title: "Directorio de Categorías",
          description: "Exporta la estructura de categorías de cursos, incluyendo descripciones, cantidad de cursos y su progreso.",
          columns: {
            id: "ID",
            name: "Nombre",
            description: "Descripción",
            courseCount: "Cursos Asociados",
            depth: "Profundidad",
            visible: "Visible",
            progress: "Progreso Promedio %"
          },
          strings: {
            yes: "Sí",
            no: "No"
          }
        },
        users: {
          title: "Listado de Usuarios",
          description: "Exporta los perfiles del sistema, y permite detallar los cursos en los que están matriculados.",
          columns: {
            id: "ID",
            fullname: "Nombre Completo",
            email: "Email",
            city: "Ciudad",
            country: "País",
            lastAccess: "Último Acceso",
            suspended: "Suspendido",
            enrolledCourses: "Cursos Matriculados",
            completedCourses: "Cursos Completados",
            progress: "Progreso Promedio %"
          },
          strings: {
            never: "Nunca",
            yes: "Sí",
            no: "No"
          }
        },
        cohorts: {
          title: "Listado de Cohortes",
          description: "Exporta los grupos del sistema (cohortes), su tamaño y progreso individual de sus miembros.",
          columns: {
            id: "ID",
            name: "Nombre Cohorte",
            idNumber: "ID Number",
            description: "Descripción",
            membersCount: "Miembros Totales",
            coursesCount: "Cursos Sincronizados",
            progress: "Progreso Promedio %"
          }
        }
      }
    }
  }
};
