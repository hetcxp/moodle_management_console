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
 * Strings for component 'tool_management_console', language 'en'.
 *
 * @package    tool_management_console
 * @copyright  2026 Hector Teran
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'Management Console';
$string['access_console'] = 'Access Console';
$string['management_console'] = 'Management Console';
$string['management_console:access'] = 'Access Management Console panel';
$string['management_console:manage_feedback'] = 'Manage feedback and support tickets';

// Privacy API.
$string['privacy:feedbackpath'] = 'Feedback and support tickets';
$string['privacy:metadata'] = 'The Management Console plugin stores feedback tickets and associated attachments.';
$string['privacy:metadata:core_files'] = 'Management Console stores screenshot files attached to feedback tickets in the Moodle file system.';
$string['privacy:metadata:tool_mng_feedback'] = 'Stores user feedback, bug reports, and support requests.';
$string['privacy:metadata:tool_mng_feedback:admincomment'] = 'Comments added by administrators while reviewing the ticket.';
$string['privacy:metadata:tool_mng_feedback:assignedto'] = 'The ID of the administrator assigned to the ticket.';
$string['privacy:metadata:tool_mng_feedback:description'] = 'The detailed description of the feedback or issue.';
$string['privacy:metadata:tool_mng_feedback:pageurl'] = 'The URL of the page where the feedback was submitted.';
$string['privacy:metadata:tool_mng_feedback:resolution'] = 'The screen resolution at the time of submission.';
$string['privacy:metadata:tool_mng_feedback:status'] = 'The current workflow status of the ticket.';
$string['privacy:metadata:tool_mng_feedback:timecreated'] = 'The time when the feedback record was created.';
$string['privacy:metadata:tool_mng_feedback:timemodified'] = 'The time when the feedback record was last modified.';
$string['privacy:metadata:tool_mng_feedback:type'] = 'The type of feedback report (issue, suggestion, etc.).';
$string['privacy:metadata:tool_mng_feedback:useragent'] = 'The browser user agent string at the time of submission.';
$string['privacy:metadata:tool_mng_feedback:userid'] = 'The ID of the user who submitted the feedback ticket.';


// License system.
$string['license_required_for_actions']    = 'An active license is required to perform this action.';
$string['verifylicensetask']               = 'Verify license and refresh time watermark';
$string['license_status_missing']          = 'No license key registered.';
$string['license_status_active']           = 'License active.';
$string['license_status_expired']          = 'License expired.';
$string['license_status_tampered']         = 'Clock inconsistency detected.';
$string['license_status_site_mismatch']    = 'License key does not match this site.';
$string['license_status_invalid_format']   = 'Invalid license key format.';
$string['license_status_invalid_signature'] = 'Invalid license key signature.';
$string['license_activate_title']          = 'Activate License';
$string['license_site_id']                 = 'Site ID';
$string['license_key_input']               = 'Activation code';
$string['license_activate_btn']            = 'Activate';
$string['license_settings']                = 'Management Console License';
$string['license_management']              = 'License Management';
$string['license_details']                 = 'License Details';
$string['license_status']                  = 'Status';
$string['license_client']                  = 'Client';
$string['license_tier']                    = 'Tier';
$string['license_expires']                 = 'Expires';
$string['license_days_remaining']          = 'Days remaining';
$string['license_remove']                  = 'Remove License';
$string['license_remove_confirm']          = 'Are you sure you want to remove the current license key?';
$string['license_removed']                 = 'License successfully removed.';
$string['license_saved']                   = 'License successfully activated.';
$string['license_back_console']            = 'Return to Management Console';
$string['license_id']                      = 'License ID';
$string['license_update_title']            = 'Update License Key';
$string['license_update_btn']              = 'Update License';
$string['license_site_id_help']            = 'Provide this Site ID to your license provider to generate or renew your license key:';
$string['license_remove_warning']          = 'If you remove the license key, Management Console will revert to read-only mode.';
$string['license_copied_clipboard']        = 'Site ID copied to clipboard';
$string['license_setting_desc']            = 'Manage the license key for this site.';
$string['license_days']                    = 'days';

// Section headings for unified settings page.
$string['feedback_settings_heading']       = 'Feedback and Support';
$string['feedback_settings_heading_desc']  = 'Configuration options for the floating feedback widget and support notifications.';
$string['license_settings_heading']        = 'License Management';
$string['license_settings_heading_desc']   = 'Activation, renewal, and status of the Management Console license.';

// Feedback & support settings.
$string['settings']                        = 'Management Console General Settings';
$string['enable_feedback']                 = 'Enable floating feedback button';
$string['enable_feedback_desc']            = 'Displays a floating button at the bottom-right corner allowing users to report issues and suggestions with viewport screenshots.';
$string['supportuserid']                   = 'Support user';
$string['supportuserid_desc']              = 'Site administrator who will receive feedback report notifications. By default, notifications are sent to the primary site administrator.';
$string['supportuserid_default']          = 'Primary site administrator (default)';
$string['license_copy_site_id']            = 'Copy Site ID';
$string['event_license_clock_tampered']    = 'License clock tampering detected';
$string['event_license_status_warning']    = 'License status warning';
