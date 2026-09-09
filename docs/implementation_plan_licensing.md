# Plan de Implementación: Sistema de Licenciamiento Offline Criptográfico (Ed25519)

Implementación del mecanismo de activación y licenciamiento para `tool_management_console`. Por defecto, la consola funciona en modo **solo lectura** (acciones visibles pero deshabilitadas/bloqueadas). Mediante el ingreso de una clave de activación con fecha absoluta firmada asimétricamente (Ed25519), se habilitan las acciones de mutación por el período contratado.

---

## 1. Arquitectura Criptográfica y Generación de Claves

### 1.1 Estructura de la Licencia
- **Algoritmo**: Ed25519 (nativo en PHP 7.2+ vía `sodium_crypto_sign_*`).
- **Vinculación**: `$CFG->siteidentifier` (identificador único del Moodle del cliente).
- **Formato del Código**: Token compacto codificado en Base64Url (`<payload_b64>.<signature_b64>`).

```json
// Payload deserializado
{
  "site_id": "8f4a1c9e2b3d...",
  "issued_at": 1773057600,
  "expires_at": 1775649600,
  "tier": "full_actions",
  "client_name": "Universidad Ejemplo"
}
```

### 1.2 Proceso Operativo de Generación (Lado Desarrollador / Venta)
1. El administrador del Moodle copia su `site_id` desde la interfaz del plugin (botón "Copiar ID de Sitio").
2. El desarrollador ejecuta el script generador CLI:
   ```bash
   php cli/generate_license.php --site=8f4a1c9e2b3d... --days=30 --client="Cliente A"
   ```
3. El script calcula `expires_at = time() + (days * 86400)`, firma el payload con la **clave privada** (custodiada por el desarrollador) y produce la clave:
   ```
   TMC-eyJzaXRlX2lkIjoiOGY0...-uK9xZ_8Q2...
   ```
4. El cliente pega esta clave en la configuración de la consola.

---

## 2. Componentes a Modificar y Crear

### Backend Moodle (`plugin/management_console/`)

#### [NEW] `plugin/management_console/classes/license_manager.php`
- Almacena la **clave pública** del desarrollador.
- **`get_site_identifier()`**: Obtiene `$CFG->siteidentifier`.
- **`verify_license(string $license_key)`**:
  - Descompone `<payload>.<signature>`.
  - Valida la firma criptográfica con `sodium_crypto_sign_verify_detached()`.
  - Valida que `site_id` coincida exactamente con el sitio actual.
  - Compara `expires_at` contra el tiempo verificado (`get_verified_time()`).
- **`get_verified_time()`**:
  - Capa 1: Intenta leer caché de tiempo de red (HTTP HEAD a Cloudflare/Google, TTL 12h).
  - Capa 2: Anti-clock tampering: consulta `MAX(timecreated)` en `mdl_logstore_standard_log`. Si `time_efectivo < max_log`, bloquea por manipulación de reloj.
- **`is_action_allowed()`**: Retorna `true` si la licencia es válida y activa.
- **`save_license(string $key)`** y **`get_license_info()`**: Lee/escribe en `mdl_config_plugins` (`plugin = 'tool_management_console', name = 'license_key'`).

#### [NEW] `cli/generate_license.php` (Herramienta Externa / Vendor)
- Script CLI para generación y rotación de par de claves Ed25519 (`--generate-keypair`) y emisión de licencias firmadas (`--site`, `--days`, `--client`).

#### [MODIFY] `plugin/management_console/classes/external/permissions.php`
- Enriquecer la respuesta de `get_permissions`:
  - `is_licensed` (0 o 1).
  - `license_status` (`'active'`, `'expired'`, `'missing'`, `'tampered'`, `'site_mismatch'`).
  - `license_expires_at` (timestamp UTC).
  - `license_days_left` (entero).
  - `site_identifier` (para que la UI permita copiarlo con un clic).

#### [MODIFY] Servicios Externos de Mutación (Guard Clauses)
- Proteger los endpoints que ejecutan mutaciones (`category_action`, `course_action`, `user_action`, `cohort_action`, `competency_action`, etc.):
  - Antes de ejecutar cualquier acción de escritura, verificar `license_manager::require_active_license()`.
  - Si no está licenciada, arrojar `moodle_exception('license_required_for_actions')`.

#### [NEW] `plugin/management_console/classes/task/verify_license_task.php`
- Scheduled Task (Cron diario) para refrescar el timestamp HTTP de red y verificar el estado de caducidad.

---

### Frontend React (`src/`)

#### [MODIFY] `src/context/AuthContext.jsx`
- Exponer el estado de licenciamiento (`isLicensed`, `licenseInfo`, `licenseStatus`, `siteId`) obtenido en `getPermissions`.
- Exponer función `activateLicense(key)`.

#### [MODIFY] `src/hooks/usePermission.js` y `src/components/PermissionGate.jsx`
- Soporte para verificación de acción activa:
  - `usePermission('can_update_users', { requiresLicense: true })`.
  - Si el usuario tiene el permiso Moodle pero el plugin no está licenciado, retorna `false` para la ejecución (o bandera `isLocked`).

#### [NEW] `src/components/LicenseModal.jsx` y `src/components/LicenseBanner.jsx`
- **Banner**: Notificación no invasiva en cabecera cuando el plugin está en modo lectura o próximo a expirar (< 7 días).
- **Modal de Activación**:
  - Muestra el `Site Identifier` con botón "Copiar".
  - Input para ingresar el código de activación.
  - Indicador de estado: Días restantes, fecha de vencimiento, o error si la clave es inválida/expirada.

#### [MODIFY] Vistas y Botones de Acción (Modo Solo Lectura)
- En lugar de ocultar botones, se muestran visibles con estilo deshabilitado o candado (`LockIcon`):
  - Botones de "Crear Curso", "Matricular", "Suspender Usuario", "Subir CSV", etc.
  - Al hacer clic en un botón bloqueado, se abre automáticamente el `LicenseModal` invitando a activar.

---

## 3. Plan de Verificación

### Pruebas Unitarias y Automatizadas
1. **Firma criptográfica**:
   - Clave válida generada con par de claves oficial $\rightarrow$ Activación exitosa.
   - Modificación de 1 solo carácter en el payload/firma $\rightarrow$ Falla inmediata (`sodium_crypto_sign_verify_detached`).
2. **Reinstalación / Mismo `site_id`**:
   - Borrar configuración de licencia en DB $\rightarrow$ Reingresar la misma clave $\rightarrow$ Mantiene la fecha de expiración original sin reiniciar días.
3. **Multi-sitio**:
   - Intentar activar la clave de un sitio A en un sitio B $\rightarrow$ Error `SITE_MISMATCH`.
4. **Anti-manipulación de reloj**:
   - Simular timestamp local atrasado respecto a los logs de Moodle $\rightarrow$ Estado `tampered` detectado y acciones bloqueadas.

### Pruebas Manuales
- Validar que un administrador pueda navegar, listar y exportar información en modo solo lectura.
- Ingresar clave de prueba de 30 días $\rightarrow$ Botones de acción se habilitan en tiempo real.
