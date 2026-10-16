import { SystemApi } from './api/system-api.js';
import { CoursesApi } from './api/courses-api.js';
import { UsersApi } from './api/users-api.js';
import { CompetenciesApi } from './api/competencies-api.js';
import { LearningPathsApi } from './api/learning-paths-api.js';

const apiModules = [
  SystemApi,
  CoursesApi,
  UsersApi,
  CompetenciesApi,
  LearningPathsApi,
];

// Invariant: zero method collision across domain API submodules
const seenMethods = new Set();
for (const apiModule of apiModules) {
  for (const method of Object.keys(apiModule)) {
    if (seenMethods.has(method)) {
      throw new Error(`Duplicate API method collision detected: ${method}`);
    }
    seenMethods.add(method);
  }
}

// Safe: duplicate method names are validated by the invariant above.
export const AdminerApi = Object.assign({}, ...apiModules);

export const ManagementConsoleApi = AdminerApi;

export {
  SystemApi,
  CoursesApi,
  UsersApi,
  CompetenciesApi,
  LearningPathsApi,
};

export default AdminerApi;


