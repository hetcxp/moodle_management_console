import { MoodleApi } from '../moodle-api.js';

export const UsersApi = {
  // Users
  async getUsers({ page = 0, perpage = 20, sort = 'lastaccess', dir = 'DESC', search = '', filters = {} } = {}) {
    return await MoodleApi.call('tool_management_console_get_users', {
      page,
      perpage,
      sort,
      dir,
      search,
      filters: JSON.stringify(filters)
    });
  },

  async getUsersKpis() {
    return await MoodleApi.call('tool_management_console_get_users_kpis');
  },

  async userAction({ action, userids = [], message_text = '' }) {
    return await MoodleApi.call('tool_management_console_user_action', {
      action,
      userids,
      message_text
    });
  },

  async addUser(userData) {
    return await MoodleApi.call('tool_management_console_add_user', userData);
  },

  async uploadUsersCsv(fileContent) {
    return await MoodleApi.call('tool_management_console_upload_users_csv', { fileContent });
  },

  // Cohorts
  async getCohortsKpis() {
    return await MoodleApi.call('tool_management_console_get_cohorts_kpis');
  },

  async getCohorts({ page = 0, perpage = 50, sort = 'name', dir = 'ASC', search = '', filters = {} } = {}) {
    return await MoodleApi.call('tool_management_console_get_cohorts', {
      page,
      perpage,
      sort,
      dir,
      search,
      filters: JSON.stringify(filters)
    });
  },

  async cohortAction({ action, cohortid = 0, name = '', idnumber = '', description = '' }) {
    return await MoodleApi.call('tool_management_console_cohort_action', {
      action,
      cohortid,
      name,
      idnumber,
      description
    });
  },

  async getUserDetail(userid) {
    return await MoodleApi.call('tool_management_console_get_user_detail', { userid });
  },

  async userCohortAction(action, userid, cohortids) {
    return await MoodleApi.call('tool_management_console_user_cohort_action', { action, userid, cohortids });
  },

  async userCourseAction(action, userid, courseids, extraParams = {}) {
    return MoodleApi.call('tool_management_console_user_course_action', {
      action,
      userid,
      courseids,
      ...extraParams
    });
  },

  async getCohortDetail(cohortid) {
    return await MoodleApi.call('tool_management_console_get_cohort_detail', { cohortid });
  }
};

export default UsersApi;
