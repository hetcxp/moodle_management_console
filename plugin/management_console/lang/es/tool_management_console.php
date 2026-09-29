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
$string['privacy:metadata'] = 'El plugin Management Console no almacena datos personales.';
$string['management_console'] = 'Consola de Gestión';
$string['management_console:access'] = 'Acceder al panel de la Consola de Gestión';

// Sistema de licencias.
$string['license_required_for_actions']    = 'Se requiere una licencia activa para realizar esta acción.';
$string['verifylicensetask']               = 'Verificar licencia y actualizar watermark de tiempo';
$string['license_status_missing']          = 'No hay clave de licencia registrada.';
$string['license_status_active']           = 'Licencia activa.';
$string['license_status_expired']          = 'Licencia vencida.';
$string['license_status_tampered']         = 'Inconsistencia de reloj detectada.';
$string['license_status_site_mismatch']    = 'La clave no corresponde a este sitio.';
$string['license_status_invalid_format']   = 'Formato de clave inválido.';
$string['license_status_invalid_signature']= 'Firma de clave inválida.';
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
$string['license_copy_site_id']            = 'Copiar ID de Sitio';
$string['event_license_clock_tampered']    = 'Manipulación del reloj de licencia detectada';
$string['event_license_status_warning']    = 'Advertencia de estado de licencia';
