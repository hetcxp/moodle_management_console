## VEREDICTO: NO-GO

## RESUMEN EJECUTIVO

Comparado con `origin/main`, `HEAD` está 14 commits adelante y el worktree está limpio.

Los cambios actuales incluyen:

- Nueva clave pública `v1` correcta y de 32 bytes Ed25519.
- Eliminación de la clave privada oficial del estado actual del código.
- Bootstrap con profundidades corregidas.
- Job dedicado PostgreSQL/PHPUnit.
- PHP lint y ESLint pasan.
- `git diff --check` pasa.
- Versión declarada: `1.3.0`.

Sin embargo, quedan dos bloqueantes.

## DEFICIENCIAS BLOQUEANTES (P0/P1)

1. **P0 — La clave privada comprometida permanece en el historial Git.**

   Aunque ya no aparece en `HEAD`, está presente en el commit ancestro `88548e8` (`plugin/management_console/tests/license_manager_test.php`) y deriva exactamente en la antigua clave pública `v1`.

   La rotación actual evita que esa clave siga siendo aceptada, pero no elimina la exposición histórica. Debe purgarse del historial publicado y confirmarse la revocación de la clave anterior.

2. **P1 — El job PHPUnit usa una opción inválida de `moodle-plugin-ci`.**

   El workflow ejecuta:

   `moodle-plugin-ci install ... --moodle-branch MOODLE_405_STABLE`

   La versión oficial acepta `--branch` o la variable `MOODLE_BRANCH`, no `--moodle-branch`. Por tanto, el job fallará antes de provisionar Moodle. La implementación oficial confirma la opción `--branch` y su workflow usa `MOODLE_BRANCH`. ([InstallCommand oficial](https://raw.githubusercontent.com/moodlehq/moodle-plugin-ci/main/src/Command/InstallCommand.php), [workflow oficial](https://raw.githubusercontent.com/moodlehq/moodle-plugin-ci/main/gha.dist.yml))

## OBSERVACIONES NO BLOQUEANTES (P2/P3)

- El plan técnico aún contiene rutas personales como `~/Dev/moodle-dev` y `/opt/homebrew/...`, pese a declarar evidencias portables.
- La ejecución local de Vitest no pudo completarse por restricciones de escritura del entorno (`EPERM` en `.vite-temp`); no constituye fallo funcional demostrado.
- La cifra declarada de 53 tests / 255 assertions no pudo reproducirse localmente porque el repositorio no incluye Moodle core; debe confirmarse tras corregir el job CI.
- La versión `1.3.0` y el savepoint `2026092903` están alineados.

## CONCLUSIÓN DE RELEASE

**NO-GO para v1.3.0.**

Antes del release deben purgarse las credenciales históricas comprometidas y corregirse `--moodle-branch` por `MOODLE_BRANCH` o `--branch`. Luego debe ejecutarse exitosamente el job PHPUnit en un runner limpio.