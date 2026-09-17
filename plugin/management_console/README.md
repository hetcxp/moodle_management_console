# Moodle Plugin: tool_management_console

Plugin de administración y consola de gestión centralizada (`admin/tool/management_console`) para Moodle 4.x / 5.x LTS.

## Características

- **Servicios Web Externos de Alta Velocidad:** Expone endpoints seguros vía Web Services / AJAX para operaciones CRUD y consultas agregadas sobre usuarios, cursos, cohortes, categorías, competencias, escalas, rutas de aprendizaje y rúbricas.
- **Arquitectura de Repositorios Dedicados:**
  - `category_repository`: jerarquías y conteos de cursos por categoría.
  - `cohort_repository`: membresías y sincronización masiva de cohortes.
  - `competency_framework_repository`: marcos de competencias, escalas (`get_scales`, `create_scale`, `update_scale`), árboles de taxonomía y reglas.
  - `competency_repository`: competencias individuales, reglas de evidencias y asignación de actividades.
  - `competency_review_repository`: planes de aprendizaje y flujos de revisión de competencias.
  - `course_repository`: listados con métricas, traslados masivos y categorización.
  - `course_enrolment_repository`: matriculación y control de usuarios y roles por curso.
  - `learning_path_repository`: itinerarios formativos, secuenciación de cursos y analítica de progreso.
  - `rubric_repository`: plantillas institucionales de rúbricas, matrices de criterios y niveles de logro.
  - `user_repository`: métricas de usuarios, enrolamiento y auditoría.
- **Single Page Application Embebida:** Aloja la interfaz compilada de React en `app/` para acceso transparente desde la administración del sitio (`/admin/tool/management_console/index.php`).
- **Autologin y Seguridad:** Soporte de autenticación mediante token WS e integración segura en iframe de Moodle Boost (`autologin.php`).

## Información de Versión

- **Componente:** `tool_management_console`
- **Versión:** `2026091700`
- **Release:** `1.1.12`
- **Maturity:** `MATURITY_STABLE`
- **Requires:** Moodle 4.5+ (`2024100700`)

## Instalación

1. Clonar o copiar este directorio en `admin/tool/management_console`.
2. Ejecutar la actualización de base de datos desde la línea de comandos de Moodle:
   ```bash
   php admin/cli/upgrade.php --non-interactive
   php admin/cli/purge_caches.php
   ```
3. Acceder desde la interfaz web en **Administración del sitio > Consola de Gestión**.
