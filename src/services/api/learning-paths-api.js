import { MoodleApi } from '../moodle-api.js';

export const LearningPathsApi = {
  async checkLearningPathDependencies() {
    return await MoodleApi.call('tool_management_console_check_lp_dependencies');
  },

  async getLearningPaths({ page = 0, perpage = 20, search = '' } = {}) {
    return await MoodleApi.call('tool_management_console_get_learning_paths', { page, perpage, search });
  },

  async getLearningPathDetail(id) {
    return await MoodleApi.call('tool_management_console_get_learning_path_detail', { courseid: id });
  },

  async searchCoursesForPath({ search = '', excludePathId = 0, page = 0, perpage = 20 } = {}) {
    return await MoodleApi.call('tool_management_console_search_courses_for_path', { search, exclude_path_id: excludePathId, page, perpage });
  },

  async createLearningPath({ fullname, shortname, startdate = 0 }) {
    return await MoodleApi.call('tool_management_console_create_learning_path', { fullname, shortname, startdate });
  },

  async updateLearningPathStructure(id, { subcourse_course_ids = [], enforce_sequence = false } = {}) {
    return await MoodleApi.call('tool_management_console_update_lp_structure', { courseid: id, subcourse_course_ids, enforce_sequence: enforce_sequence ? 1 : 0 });
  },

  async deleteLearningPath(id) {
    return await MoodleApi.call('tool_management_console_delete_learning_path', { courseid: id });
  },

  async manageLearningPathEnrolments(id, { action, cohortids = [], userids = [] } = {}) {
    return await MoodleApi.call('tool_management_console_manage_lp_enrolments', { courseid: id, action, cohortids, userids });
  }
};

export default LearningPathsApi;
