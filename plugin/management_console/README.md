# Moodle Plugin: tool_management_console

Plugin de administración y consola de gestión centralizada (`admin/tool/management_console`) para Moodle 4.x / 5.x LTS.

## Características

- **Servicios Web Externos de Alta Velocidad:** Expone endpoints seguros vía Web Services / AJAX para operaciones CRUD y consultas agregadas sobre usuarios, cursos, cohortes, categorías, competencias, escalas, rutas de aprendizaje, respaldos MBZ, rúbricas y licenciamiento.
- **Arquitectura de Repositorios Dedicados:**
  - `category_repository`: jerarquías y conteos de cursos por categoría.
  - `cohort_repository`: membresías y sincronización masiva de cohortes.
  - `competency_framework_repository`: marcos de competencias, escalas (`get_scales`, `create_scale`, `update_scale`), árboles de taxonomía y reglas.
  - `competency_repository`: competencias individuales con soporte jerárquico de hasta 3 niveles, reglas de evidencias y asignación de actividades.
  - `competency_review_repository`: planes de aprendizaje y flujos de revisión de competencias.
  - `course_repository`: listados con métricas, traslados masivos y categorización.
  - `course_enrolment_repository`: matriculación y control de usuarios y roles por curso.
  - `learning_path_repository`: itinerarios formativos, secuenciación de cursos y analítica de progreso sin mutación colateral en consultas de lectura.
  - `rubric_repository`: plantillas institucionales de rúbricas, matrices de criterios y niveles de logro.
  - `user_repository`: métricas de usuarios, enrolamiento y auditoría.
- **Gestión Criptográfica de Licencias (`license_manager.php`):**
  - Verificación asimétrica basada en firmas Ed25519 (extensión PHP `sodium`).
  - Vinculación obligatoria al identificador único del sitio Moodle (`$CFG->siteidentifier`).
  - Detección anti-tampering de saltos temporales en el reloj del servidor mediante marca de agua monótona en base de datos.
  - Eventos de auditoría de seguridad: `license_clock_tampered` y `license_status_warning`.
  - Tarea programada (Scheduled Task) `verify_license_task` (`\tool_management_console\task\verify_license_task`) registrada en `db/tasks.php` para monitoreo continuo en cron.
  - Endpoint externo `external/license.php` con métodos para consultar estado (`get_license_info`), ingresar clave (`set_license_key`) y revocar (`clear_license_key`).
  - Interfaz de activación administrativa en `license.php`.
- **Copia de Seguridad y Restauración MBZ:** Endpoints dedicados (`course_backups.php`, `upload_mbz.php`) para carga segura de archivos `.mbz`, exploración de respaldos en servidor y restauración directa de cursos en categorías con verificación estricta de rutas.
- **Soporte Bilingüe Nativo (i18n):**
  - Paquetes de cadenas completas en Inglés (`lang/en/tool_management_console.php`) y Español (`lang/es/tool_management_console.php`).
- **Seguridad y Hardening Corporativo:**
  - Generación de tokens de sesión acotados a 8 horas de vigencia (`index.php`).
  - Serialización de configuración JS con protección estricta contra inyección XSS (`JSON_HEX_*`).
  - Almacenamiento temporal protegido con permisos `0750`, nombres de archivo opacos y control de orígenes CORS.
  - Servicios externos desacoplados y libres de delegaciones proxy obsoletas (`competency_frameworks.php`).
- **Single Page Application Embebida:** Aloja la interfaz compilada de React en `app/` para acceso transparente desde la administración del sitio (`/admin/tool/management_console/index.php`).
- **Autologin y Seguridad:** Soporte de autenticación mediante token WS e integración segura en iframe de Moodle Boost (`autologin.php`).

## Información de Versión

- **Componente:** `tool_management_console`
- **Versión:** `2026092903`
- **Release:** `1.3.0`
- **Maturity:** `MATURITY_STABLE`
- **Requires:** Moodle 4.5+ (`2024100700`)

## Instalación

1. Clonar o copiar este directorio en `admin/tool/management_console`.
2. Ejecutar la actualización de base de datos desde la línea de comandos de Moodle:
   ```bash
   php admin/cli/upgrade.php --non-interactive
   php admin/cli/purge_caches.php
   ```
3. Acceder desde la interfaz web en **Administración del sitio > Consola de Administración**.

## Verificación y Tests PHPUnit

El plugin incluye suite de pruebas unitarias para el gestor de licencias y endpoints:

```bash
vendor/bin/phpunit --configuration plugin/management_console/phpunit.xml plugin/management_console/tests/license_manager_test.php
```
