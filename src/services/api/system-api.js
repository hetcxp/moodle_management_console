import { MoodleApi } from '../moodle-api.js';

export const SystemApi = {
  // 1. Dashboard
  async getDashboard() {
    return await MoodleApi.call('tool_management_console_get_dashboard');
  },

  // 2. Permissions
  async getPermissions() {
    return await MoodleApi.call('tool_management_console_get_permissions');
  },

  // 2b. License
  async saveLicense(key) {
    return await MoodleApi.call('tool_management_console_save_license', { key });
  },
  async getLicenseInfo() {
    return await MoodleApi.call('tool_management_console_get_license_info');
  },
  async removeLicense() {
    return await MoodleApi.call('tool_management_console_remove_license');
  },

  // Autologin
  async getAutologinUrl(destination) {
    return await MoodleApi.call('tool_management_console_get_autologin_url', { destination });
  }
};

export default SystemApi;
