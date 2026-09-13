# Sistema de Licenciamiento Offline Criptográfico (Ed25519)

Implementar el mecanismo de activación para `tool_management_console`. Por defecto la consola opera en **modo solo lectura** (botones visibles pero bloqueados). Una clave de activación Ed25519 firmada por el desarrollador habilita las acciones de mutación hasta la fecha de vencimiento embebida en el token.

> [!IMPORTANT]
> Leer `.llm_build/index.md` antes de cualquier edición. Ejecutar `extract_schemas.py` si hay cambios estructurales previos no indexados.

---

## Proposed Changes

### Backend — Nuevos archivos PHP

#### [NEW] `plugin/management_console/classes/license_manager.php`

Clase estática `\tool_management_console\license_manager`. Implementar los siguientes métodos con estas firmas y contratos exactos:

```
CONSTANTE: PUBLIC_KEY_B64 = '<placeholder — se sustituye al generar keypair>'

get_site_identifier(): string
  → return $CFG->siteidentifier

verify_license(string $license_key): array
  → Descomponer $license_key por el último '.' en [$payload_b64, $sig_b64]
  → sodium_base642bin() ambas partes (SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING)
  → sodium_crypto_sign_verify_detached($sig, $payload_raw, $pubkey) → false = ['valid'=>false,'status'=>'invalid_signature']
  → json_decode($payload_raw) → extraer site_id, expires_at, issued_at, client_name, tier
  → site_id !== get_site_identifier() → ['valid'=>false,'status'=>'site_mismatch']
  → expires_at < get_verified_time() → ['valid'=>false,'status'=>'expired']
  → return ['valid'=>true,'status'=>'active','expires_at'=>$expires_at,'client_name'=>$client_name,'days_left'=>ceil(($expires_at - time()) / 86400)]

get_verified_time(): int
  → Leer cache_manager::get('license_verified_time') (set por el cron task)
  → Si vacío/null → fallback: return time() [permisivo, no bloquear]
  → Anti-tamper: $max_log = $DB->get_field_sql('SELECT MAX(timecreated) FROM {logstore_standard_log}')
  → Si time() < ($max_log - 300): registrar en $DB->insert_record('log', [...]) → return con status 'tampered'
  → return $cached_time ?? time()

is_action_allowed(): bool
  → $info = get_license_info() → return ($info['status'] === 'active')

require_active_license(): void
  → if (!is_action_allowed()) throw new \moodle_exception('license_required_for_actions', 'tool_management_console')

save_license(string $key): array
  → $result = verify_license($key)
  → Si valid: set_config('license_key', $key, 'tool_management_console')
  → return $result

get_license_info(): array
  → $key = get_config('tool_management_console', 'license_key')
  → Si vacío: return ['valid'=>false,'status'=>'missing','expires_at'=>0,'days_left'=>0,'client_name'=>'']
  → return verify_license($key)
```

---

#### [NEW] `plugin/management_console/classes/external/license.php`

Namespace `tool_management_console\external`. Clase `license extends external_api`. Dos funciones web service:

**`save_license(string $key)`**
- Parameters: `['key' => new external_value(PARAM_RAW, 'License activation key')]`
- Returns: `external_single_structure` con campos: `valid` (PARAM_BOOL), `status` (PARAM_TEXT), `expires_at` (PARAM_INT), `days_left` (PARAM_INT), `client_name` (PARAM_TEXT)
- Body: `require_login(); $context = context_system::instance(); self::validate_context($context); require_capability('moodle/site:config', $context);` → delegar a `license_manager::save_license($key)`

**`get_license_info()`**
- Parameters: `new external_function_parameters([])`
- Returns: misma `external_single_structure` que `save_license`
- Body: `require_login();` → delegar a `license_manager::get_license_info()`

---

#### [NEW] `plugin/management_console/classes/task/verify_license_task.php`

Namespace `tool_management_console\task`. Clase `verify_license_task extends \core\task\scheduled_task`.

```
get_name(): string → 'Verify Management Console License'

execute(): void
  → HTTP HEAD a 'https://www.cloudflare.com' con curl, timeout 5s
  → Extraer 'Date' header → strtotime() → $network_time
  → Si falla curl: $network_time = time()
  → cache_manager::set('license_verified_time', $network_time, 43200) // TTL 12h
  → license_manager::get_license_info() → si status === 'expired': trigger_event o log
```

---

#### [MODIFY] `plugin/management_console/db/services.php`

Agregar al array `$functions` las dos nuevas funciones. Usar el mismo patrón que las funciones existentes:

```php
'tool_management_console_save_license' => [
    'classname'   => 'tool_management_console\external\license',
    'methodname'  => 'save_license',
    'description' => 'Save and validate a license activation key',
    'type'        => 'write',
    'capabilities'=> 'moodle/site:config',
    'ajax'        => true,
],
'tool_management_console_get_license_info' => [
    'classname'   => 'tool_management_console\external\license',
    'methodname'  => 'get_license_info',
    'description' => 'Get current license status and metadata',
    'type'        => 'read',
    'ajax'        => true,
],
```

Agregar también al array `$tasks` (o crear `db/tasks.php` si no existe):

```php
[
    'classname'   => '\tool_management_console\task\verify_license_task',
    'blocking'    => 0,
    'minute'      => '0',
    'hour'        => '3',
    'day'         => '*',
    'month'       => '*',
    'dayofweek'   => '*',
],
```

---

#### [MODIFY] `plugin/management_console/classes/external/permissions.php`

En `get_permissions()`: agregar al array de retorno:

```php
$license = \tool_management_console\license_manager::get_license_info();
// ...añadir al return existente:
'is_licensed'        => $license['valid'] ? 1 : 0,
'license_status'     => $license['status'],
'license_expires_at' => $license['expires_at'] ?? 0,
'license_days_left'  => $license['days_left'] ?? 0,
'site_identifier'    => \tool_management_console\license_manager::get_site_identifier(),
```

En `get_permissions_returns()`: agregar los cinco campos correspondientes con sus tipos `PARAM_INT` / `PARAM_TEXT`.

---

#### [MODIFY] Servicios de mutación — Guard clauses

En cada uno de los archivos `classes/external/{categories,courses,users,cohorts,competencies}.php`, al inicio de **cada método de escritura** (crear, actualizar, eliminar, matricular, suspender, etc.), agregar como primera línea del cuerpo:

```php
\tool_management_console\license_manager::require_active_license();
```

Los métodos de solo lectura (`get_*`, `list_*`, `view_*`) **no deben ser protegidos**.

---

#### [NEW] `cli/generate_license.php`

Script CLI standalone (no carga Moodle bootstrap). Requiere solo la extensión `sodium` de PHP. Soportar los siguientes flags via `getopt`:

| Flag | Descripción |
|---|---|
| `--generate-keypair` | Genera y muestra par Ed25519 en Base64Url. No emite licencia. |
| `--private-key=<b64>` | Clave privada para firmar |
| `--site=<id>` | `site_identifier` del cliente |
| `--days=<n>` | Vencimiento = `time() + (n * 86400)` |
| `--expires=<YYYY-MM-DD>` | Vencimiento = `strtotime($date . ' 23:59:59 UTC')` |
| `--client=<nombre>` | Nombre del cliente (va en el payload) |
| `--tier=full_actions` | (opcional, default `full_actions`) |

Formato del token de salida: `TMC-` + `base64url(json_encode($payload))` + `.` + `base64url(sodium_crypto_sign_detached($payload_raw, $privkey))`

---

### Frontend React (`src/`)

#### [MODIFY] `src/context/AuthContext.jsx`

1. En el fallback de permisos (líneas 45-60 actuales), agregar:
   ```js
   is_licensed: 0,
   license_status: 'missing',
   license_expires_at: 0,
   license_days_left: 0,
   site_identifier: '',
   ```

2. Agregar función `activateLicense(key)` dentro de `AuthProvider`:
   ```js
   const activateLicense = async (key) => {
     const result = await AdminerApi.call('tool_management_console_save_license', { key });
     if (result.valid) await fetchPermissions(false);
     return result;
   };
   ```

3. Exponer en el `value` del Provider: `activateLicense`, y del objeto `permissions` derivar:
   ```js
   isLicensed: permissions?.is_licensed === 1,
   licenseStatus: permissions?.license_status ?? 'missing',
   licenseExpiresAt: permissions?.license_expires_at ?? 0,
   licenseDaysLeft: permissions?.license_days_left ?? 0,
   siteId: permissions?.site_identifier ?? '',
   ```

---

#### [MODIFY] `src/components/PermissionGate.jsx`

Agregar prop `requiresLicense` (default `false`). Si `requiresLicense === true` y `isLicensed === false` del contexto, retornar el children con `isLocked: true` pasado via `React.cloneElement` o renderizar el `fallback` con prop `locked={true}`.

Contrato de la firma actual: `({ capability, permission, children, fallback = null })` → extender a `({ capability, permission, requiresLicense = false, children, fallback = null })`.

**No cambiar la lógica de `capability`/`permission` existente.**

---

#### [NEW] `src/components/LicenseBanner.jsx`

Banner condicional. Mostrar cuando `licenseStatus !== 'active'` o `licenseDaysLeft <= 7`. Props: ninguna (lee del contexto `useAuth`). Al hacer click → abrir `LicenseModal`. Diseño: franja no intrusiva en la parte superior del layout, con icono de candado y mensaje según estado:

| `licenseStatus` | Mensaje |
|---|---|
| `missing` | "La consola está en modo solo lectura. Ingresa tu clave de activación." |
| `expired` | "Tu licencia venció el {fecha}. Renueva para habilitar las acciones." |
| `tampered` | "Se detectó una inconsistencia en el reloj del servidor. Contacta soporte." |
| `site_mismatch` | "La clave registrada no corresponde a este sitio." |
| `active` + days_left ≤ 7 | "Tu licencia vence en {N} días. Renueva pronto." |

---

#### [NEW] `src/components/LicenseModal.jsx`

Modal de activación de licencia. Props: `isOpen`, `onClose`. Leer `siteId` y `activateLicense` de `useAuth`.

Secciones:
1. **Site ID**: campo de texto readonly con botón "Copiar" (usa `navigator.clipboard.writeText`).
2. **Input de clave**: `<textarea>` para pegar el token `TMC-...`.
3. **Botón "Activar"**: llama `activateLicense(key)`, muestra spinner, luego estado resultante.
4. **Estado**: si `result.valid` → mensaje verde con fecha de vencimiento y días restantes. Si error → mensaje rojo con descripción del estado (`SITE_MISMATCH`, `expired`, `invalid_signature`).

---

#### [MODIFY] Vistas con botones de mutación

En todas las vistas que contienen botones de acción de escritura (`CategoryManager`, `CourseManager`, `UserManager`, `CohortManager`, `CompetencyManager`, etc.): envolver cada botón de acción de mutación en `<PermissionGate requiresLicense={true} ...>`. Cuando `isLocked`, renderizar el botón con:
- `disabled` y clase CSS de opacidad reducida
- Ícono de candado (`LockIcon` de `lucide-react`) a la izquierda del label
- `onClick` interceptado: abrir `LicenseModal` en lugar de ejecutar la acción

---

## Verification Plan

### Comandos de verificación automática post-implementación

```bash
# 1. Verificar que la clase existe y tiene los métodos esperados
grep -n "function verify_license\|function save_license\|function get_license_info\|function require_active_license\|function get_verified_time\|function is_action_allowed\|function get_site_identifier" \
  plugin/management_console/classes/license_manager.php

# 2. Verificar registro en services.php
grep -n "save_license\|get_license_info" plugin/management_console/db/services.php

# 3. Verificar guard clauses en al menos un servicio de mutación
grep -n "require_active_license" plugin/management_console/classes/external/courses.php

# 4. Verificar build React sin errores
npm run build 2>&1 | tail -20
```

### Casos de prueba manuales (orden de ejecución)
1. Activar con clave de sitio incorrecto → UI muestra `SITE_MISMATCH`
2. Activar con clave válida de 30 días → botones se habilitan en tiempo real, banner desaparece
3. Modificar 1 carácter de la clave → UI muestra `invalid_signature`
4. Reinstalar (borrar `license_key` en `mdl_config_plugins`) → reingresar misma clave → misma fecha de vencimiento
5. Verificar modo solo lectura: navegar, listar, exportar funciona; crear/editar/eliminar bloqueado

---

## 4. Guía Rápida: Generar una Clave para un Cliente

> Procedimiento operativo para emitir una licencia por cada instalación nueva o renovación.

### Qué necesitas
- Tu **clave privada** (guardada en tu lugar seguro desde la configuración inicial).
- El **ID de Sitio** que el cliente copia desde la pantalla de configuración de la consola.
- La **fecha de vencimiento** o la **cantidad de días** acordada.

### Paso a paso

**1. Abre una terminal** en tu computadora.

**2. Ejecuta el comando** según lo acordado:

Por **cantidad de días:**
```bash
php cli/generate_license.php \
  --private-key="PEGA_TU_CLAVE_PRIVADA_AQUÍ" \
  --site="PEGA_EL_ID_DE_SITIO_DEL_CLIENTE_AQUÍ" \
  --days=365 \
  --client="Nombre del Cliente"
```

Por **fecha de vencimiento exacta:**
```bash
php cli/generate_license.php \
  --private-key="PEGA_TU_CLAVE_PRIVADA_AQUÍ" \
  --site="PEGA_EL_ID_DE_SITIO_DEL_CLIENTE_AQUÍ" \
  --expires="2027-12-31" \
  --client="Nombre del Cliente"
```

**3. Copia la clave generada:**
```
TMC-eyJzaXRlX2lkIjoiOGY0...-uK9xZ_8Q2...
```

**4. Envíasela al cliente.** El administrador la pega en "Código de Activación" y hace clic en "Activar". Los botones se habilitan de inmediato.

> **Sin reinicio. Sin tocar el servidor.**


Implementación del mecanismo de activación y licenciamiento para `tool_management_console`. Por defecto, la consola funciona en modo **solo lectura** (acciones visibles pero deshabilitadas/bloqueadas). Mediante el ingreso de una clave de activación con fecha absoluta firmada asimétricamente (Ed25519), se habilitan las acciones de mutación por el período contratado.
