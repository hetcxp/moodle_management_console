import { getTenantConfig } from './tenant.js';

const config = getTenantConfig();

export const API_CONFIG = {
  baseUrl: config.moodleUrl,
  serviceName: config.serviceName,
  endpoints: {
    login: '/login/token.php',
    rest: '/webservice/rest/server.php',
    pluginfile: '/webservice/pluginfile.php'
  }
};

