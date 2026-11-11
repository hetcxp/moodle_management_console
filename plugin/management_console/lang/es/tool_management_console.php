<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Strings for component 'tool_management_console', language 'es'.
 *
 * Status identifiers remain in English in backend/frontend.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'Consola de Gestión';
$string['access_console'] = 'Acceso a la Consola';
$string['management_console'] = 'Consola de Gestión';
$string['management_console:access'] = 'Acceder al panel de la Consola de Gestión';
$string['management_console:manage_feedback'] = 'Gestionar reportes y tickets de feedback';

// Privacy API.
$string['privacy:feedbackpath'] = 'Tickets de soporte y feedback';
$string['privacy:metadata'] = 'El plugin Consola de Gestión almacena tickets de feedback y archivos adjuntos asociados.';
$string['privacy:metadata:core_files'] = 'Consola de Gestión almacena archivos de captura de pantalla adjuntos a tickets de feedback en el sistema de archivos de Moodle.';
$string['privacy:metadata:tool_mng_feedback'] = 'Almacena comentarios de usuarios, reportes de fallos y solicitudes de soporte.';
$string['privacy:metadata:tool_mng_feedback:admincomment'] = 'Comentarios añadidos por administradores durante la revisión del ticket.';
$string['privacy:metadata:tool_mng_feedback:assignedto'] = 'El ID del administrador asignado al ticket.';
$string['privacy:metadata:tool_mng_feedback:description'] = 'La descripción detallada del feedback o problema.';
$string['privacy:metadata:tool_mng_feedback:pageurl'] = 'La URL de la página donde se envió el feedback.';
$string['privacy:metadata:tool_mng_feedback:resolution'] = 'La resolución de pantalla al momento del envío.';
$string['privacy:metadata:tool_mng_feedback:status'] = 'El estado actual del flujo de trabajo del ticket.';
$string['privacy:metadata:tool_mng_feedback:timecreated'] = 'La fecha y hora en que se creó el registro de feedback.';
$string['privacy:metadata:tool_mng_feedback:timemodified'] = 'La fecha y hora en que se modificó por última vez el registro de feedback.';
$string['privacy:metadata:tool_mng_feedback:type'] = 'El tipo de reporte de feedback (problema, sugerencia, etc.).';
$string['privacy:metadata:tool_mng_feedback:useragent'] = 'La cadena de agente de usuario del navegador al momento del envío.';
$string['privacy:metadata:tool_mng_feedback:userid'] = 'El ID del usuario que envió el ticket de feedback.';


// Sistema de licencias.
$string['license_required_for_actions']    = 'Se requiere una licencia activa para realizar esta acción.';
$string['verifylicensetask']               = 'Verificar licencia y actualizar watermark de tiempo';
$string['license_status_missing']          = 'No hay clave de licencia registrada.';
$string['license_status_active']           = 'Licencia activa.';
$string['license_status_expired']          = 'Licencia vencida.';
$string['license_status_tampered']         = 'Inconsistencia de reloj detectada.';
$string['license_status_site_mismatch']    = 'La clave no corresponde a este sitio.';
$string['license_status_invalid_format']   = 'Formato de clave inválido.';
$string['license_status_invalid_signature'] = 'Firma de clave inválida.';
$string['license_activate_title']          = 'Activar Licencia';
$string['license_site_id']                 = 'ID de Sitio';
$string['license_key_input']               = 'Código de activación';
$string['license_activate_btn']            = 'Activar';
$string['license_settings']                = 'Licencia de Consola de Gestión';
$string['license_management']              = 'Gestión de Licencia';
$string['license_details']                 = 'Detalles de Licencia';
$string['license_status']                  = 'Estado';
$string['license_client']                  = 'Cliente';
$string['license_tier']                    = 'Nivel';
$string['license_expires']                 = 'Vencimiento';
$string['license_days_remaining']          = 'Días restantes';
$string['license_remove']                  = 'Remover Licencia';
$string['license_remove_confirm']          = '¿Está seguro de que desea remover la clave de licencia actual?';
$string['license_removed']                 = 'Licencia removida exitosamente.';
$string['license_saved']                   = 'Licencia activada exitosamente.';
$string['license_back_console']            = 'Volver a la Consola de Gestión';
$string['license_id']                      = 'ID de Licencia';
$string['license_update_title']            = 'Actualizar Clave de Licencia';
$string['license_update_btn']              = 'Actualizar Licencia';
$string['license_site_id_help']            = 'Proporcione este Identificador de Sitio a su proveedor para generar o renovar su clave de licencia:';
$string['license_remove_warning']          = 'Si remueve la clave de licencia, la Consola de Gestión volverá a operar en modo solo lectura.';
$string['license_copied_clipboard']        = 'ID copiado al portapapeles';
$string['license_setting_desc']            = 'Administre la clave de licencia para este sitio.';
$string['license_days']                    = 'días';

// Encabezados de sección para página de configuración unificada.
$string['feedback_settings_heading']       = 'Feedback y Soporte';
$string['feedback_settings_heading_desc']  = 'Opciones de configuración para el widget flotante de feedback y notificaciones de soporte.';
$string['license_settings_heading']        = 'Gestión de Licencia';
$string['license_settings_heading_desc']   = 'Activación, renovación y estado de la licencia de la Consola de Gestión.';

// Configuración de soporte y feedback.
$string['settings']                        = 'Configuración General de Consola de Gestión';
$string['enable_feedback']                 = 'Habilitar botón flotante de reporte';
$string['enable_feedback_desc']            = 'Muestra un botón en la esquina inferior derecha para que los usuarios reporten errores y sugerencias con captura de pantalla.';
$string['supportuserid']                   = 'Usuario de soporte';
$string['supportuserid_desc']              = 'Administrador del sitio que recibirá las notificaciones de los reportes. Por defecto, las notificaciones se envían al administrador principal del sitio.';
$string['supportuserid_default']          = 'Administrador principal del sitio (por defecto)';
$string['license_copy_site_id']            = 'Copiar ID de Sitio';
$string['event_license_clock_tampered']    = 'Manipulación del reloj de licencia detectada';
$string['event_license_status_warning']    = 'Advertencia de estado de licencia';
