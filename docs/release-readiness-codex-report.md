- VEREDICTO: NO-GO

- RESUMEN EJECUTIVO

`HEAD` está 11 commits por delante de `origin/main`, con 287 archivos modificados, incluyendo licenciamiento Ed25519, hardening backend, cambios de UI y bundles Vite.

La base técnica es prometedora: PHP 8.3 y Sodium están disponibles, PHP lint y el contrato API pasan, y los 81 módulos JS compilados no tienen imports faltantes. Sin embargo, el release no cumple estrictamente el DoD ni los gates solicitados.

Además, el worktree está sucio por la eliminación no confirmada de `docs/implementation_plan_licensing.md`.

- DEFICIENCIAS BLOQUEANTES (P0/P1)

1. PHPUnit no es un gate obligatorio en CI — P1

   Archivo: [.github/workflows/ci.yml:60-79](/Users/hectorteran/Documents/moodle_management_console/.github/workflows/ci.yml:60)

   El workflow emite warning y continúa cuando Moodle no está disponible. Solo falla si se define manualmente `CI_STRICT_PHPUNIT=1`.

   Evidencia adicional:

   - La ejecución local no fue reproducible: el `phpunit.xml` intenta resolver un bootstrap inexistente desde el symlink.
   - Forzando el bootstrap correcto, PHPUnit aborta porque `$CFG->dataroot` no es escribible.

   Acción correctiva exacta: hacer que PHPUnit sea obligatorio para el release, provisionar Moodle/PHP 8.3 con dataroot escribible en CI y eliminar el camino exitoso por warning; o fallar siempre si el harness no está disponible.

2. Definition of Done contradictorio y falso — P1

   Archivo: [docs/technical-debt-audit-remediation-plan.md:33-42](/Users/hectorteran/Documents/moodle_management_console/docs/technical-debt-audit-remediation-plan.md:33), [docs/technical-debt-audit-remediation-plan.md:168-173](/Users/hectorteran/Documents/moodle_management_console/docs/technical-debt-audit-remediation-plan.md:168)

   El documento declara todos los gates como PASS/DONE, pero también conserva `TD-CI-002 [IN_PROGRESS]` y reconoce que PHPUnit no queda validado.

   Acción correctiva exacta: reconciliar el plan con evidencia reproducible; no marcar `TD-CI-002`, `TD-REL-001` ni el veredicto global como DONE hasta ejecutar PHPUnit exitosamente.

3. `git diff --check` falla — P1

   Archivos afectados:

   - `plugin/management_console/classes/external/competency_frameworks.php:284`
   - `scripts/test_category_api.js:83,98`
   - `src/__tests__/HtmlSanitization.test.jsx:48`
   - `src/components/LicenseModal.jsx:351`
   - `src/components/PermissionGate.jsx:109`
   - `src/views/CourseDetailView.jsx:175,177-178`
   - `src/views/courses/CourseRestoreModal.jsx:248`

   Acción correctiva exacta: eliminar whitespace final y líneas vacías finales, y repetir `git diff --check`.

4. Capability Moodle inexistente para autologin — P1

   Archivos: [plugin/management_console/classes/external/autologin.php:66-67](/Users/hectorteran/Documents/moodle_management_console/plugin/management_console/classes/external/autologin.php:66), [plugin/management_console/db/services.php:227-233](/Users/hectorteran/Documents/moodle_management_console/plugin/management_console/db/services.php:227), [plugin/management_console/db/access.php:27-35](/Users/hectorteran/Documents/moodle_management_console/plugin/management_console/db/access.php:27)

   Se exige `tool/management_console:view`, pero `db/access.php` solo define `tool/management_console:access`. El endpoint puede fallar o rechazar usuarios válidos.

   Acción correctiva exacta: sustituir `tool/management_console:view` por `tool/management_console:access` en autologin y `services.php`, o declarar formalmente la capability `view`, asignarla a los archetypes requeridos y añadir cobertura PHPUnit.

5. Falta el artefacto AMD solicitado — P1

   No existe `plugin/management_console/amd/` ni `plugin/management_console/amd/build/`.

   El plugin utiliza `app/assets`, referenciado en [plugin/management_console/app/index.html:10-11](/Users/hectorteran/Documents/moodle_management_console/plugin/management_console/app/index.html:10), y cargado manualmente desde [plugin/management_console/index.php:95-112](/Users/hectorteran/Documents/moodle_management_console/plugin/management_console/index.php:95).

   Acción correctiva exacta: generar y versionar los módulos AMD en `plugin/management_console/amd/build/`, o documentar formalmente que el plugin no usa AMD y retirar ese criterio del gate de release. Con el criterio solicitado actualmente, falla compliance.

6. Configuración PHPUnit no portable con el symlink documentado — P1

   Archivo: [plugin/management_console/phpunit.xml:5](/Users/hectorteran/Documents/moodle_management_console/plugin/management_console/phpunit.xml:5)

   `bootstrap="../../../lib/phpunit/bootstrap.php"` se resuelve contra el path real del repositorio y falla cuando el plugin se instala mediante symlink, pese a que la documentación recomienda ese flujo.

   Acción correctiva exacta: ejecutar PHPUnit desde un plugin realmente ubicado bajo el árbol Moodle o adaptar el harness/CI para resolver explícitamente el bootstrap Moodle sin depender de la resolución del symlink.

7. Worktree sucio y documentación eliminada — P1 para el candidato actual

   Archivo: `docs/implementation_plan_licensing.md:1-327` — eliminado en el worktree, aunque existe en `HEAD`.

   El propio DoD afirma que esa documentación fue conservada en [docs/technical-debt-audit-remediation-plan.md:54,112](/Users/hectorteran/Documents/moodle_management_console/docs/technical-debt-audit-remediation-plan.md:54).

   Acción correctiva exacta: restaurar el archivo o confirmar formalmente su eliminación, actualizar el plan y dejar el worktree limpio antes de empaquetar el release.

8. Clave pública de producción no demostrada — P1 operativo

   Archivo: [plugin/management_console/classes/license_manager.php:37-42](/Users/hectorteran/Documents/moodle_management_console/plugin/management_console/classes/license_manager.php:37)

   El código describe `PUBLIC_KEYS['v1']` como valor placeholder y no existe evidencia versionada de que corresponda a la clave privada usada por `cli/generate_license.php`.

   Acción correctiva exacta: verificar end-to-end una licencia emitida con la clave privada de producción, reemplazar el placeholder si corresponde y registrar evidencia reproducible sin incluir la clave privada.

- OBSERVACIONES NO BLOQUEANTES (P2/P3)

- [plugin/management_console/db/upgrade.php:54-57](/Users/hectorteran/Documents/moodle_management_console/plugin/management_console/db/upgrade.php:54) solo registra savepoint `2026092902`, mientras `version.php` declara `2026092903`. Añadir el savepoint final o justificar explícitamente que no hay migración asociada.

- La tarea [verify_license_task.php:50-55](/Users/hectorteran/Documents/moodle_management_console/plugin/management_console/classes/task/verify_license_task.php:50) permite una URL configurable para `get_headers()`. Conviene restringirla a HTTPS y a una allowlist fija para evitar SSRF y manipulación del watermark.

- `cli/generate_license.php:115-122` usa `mt_rand()` para el UUID de licencia. No compromete la firma Ed25519, pero debería utilizar `random_bytes()`.

- `README.md` documenta 348 tests/50 suites, mientras el plan declara 420 tests/79 suites. También menciona nombres antiguos de endpoints (`set_license_key`, `clear_license_key`).

- La UI de acciones bloqueadas deshabilita el botón, pero no abre directamente el modal de licencia; depende del banner, header o sidebar.

- Hay strings hardcodeadas en español en `license.php`, en lugar de usar completamente el sistema de idiomas Moodle.

- La definición `license_info` en `db/caches.php` no parece utilizarse como caché efectiva; puede eliminarse o implementarse.

- CONCLUSIÓN DE RELEASE

El candidato no está listo para `v1.3.0`. El veredicto correcto es `NO-GO`.

La prioridad inmediata es cerrar el gate PHPUnit, corregir la capability inexistente, resolver el requisito `amd/build`, limpiar el diff, reconciliar el Definition of Done y validar la clave pública de producción mediante una licencia real de extremo a extremo.