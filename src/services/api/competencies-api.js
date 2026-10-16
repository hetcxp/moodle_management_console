import { MoodleApi } from '../moodle-api.js';

export const CompetenciesApi = {
  async getScales() {
    return await MoodleApi.call('tool_management_console_get_scales');
  },

  async scaleAction({ action, scaleid = 0, name = '', items = '' }) {
    return await MoodleApi.call('tool_management_console_scale_action', {
      action,
      scaleid,
      name,
      items,
    });
  },

  async getRubricTemplates({ search = '', page = 0, perpage = 50 } = {}) {
    return await MoodleApi.call('tool_management_console_get_rubric_templates', {
      search,
      page,
      perpage,
    });
  },

  async rubricTemplateAction({ action, templateid = 0, name = '', description = '', criteria = [] } = {}) {
    return await MoodleApi.call('tool_management_console_rubric_template_action', {
      action,
      templateid,
      name,
      description,
      criteria: typeof criteria === 'string' ? criteria : JSON.stringify(criteria),
    });
  },

  async getCompetencyKpis() {
    return await MoodleApi.call('tool_management_console_get_competency_kpis');
  },

  async getCompetencyFrameworks({ page = 0, perpage = 50, sort = 'shortname', dir = 'ASC', search = '', filters = {} } = {}) {
    return await MoodleApi.call('tool_management_console_get_competency_frameworks', {
      page,
      perpage,
      sort,
      dir,
      search,
      filters: JSON.stringify(filters)
    });
  },

  async getAllCompetencies({ frameworkid = 0 } = {}) {
    return await MoodleApi.call('tool_management_console_get_all_competencies', {
      frameworkid
    });
  },

  async competencyFrameworkAction({ action, frameworkid = 0, shortname = '', idnumber = '', description = '', scaleid = 0, visible = 1 }) {
    return await MoodleApi.call('tool_management_console_competency_framework_action', {
      action,
      frameworkid,
      shortname,
      idnumber,
      description,
      scaleid,
      visible
    });
  },

  async getCompetencyFrameworkDetail(frameworkid, search = '') {
    return await MoodleApi.call('tool_management_console_get_competency_framework_detail', { frameworkid, search });
  },

  async competencyAction({ action, competencyid = 0, frameworkid = 0, parentid = 0, shortname = '', idnumber = '', description = '', ruletype = '', ruleoutcome = 1, ruleconfig = '' }) {
    return await MoodleApi.call('tool_management_console_competency_action', {
      action,
      competencyid,
      frameworkid,
      parentid,
      shortname,
      idnumber,
      description,
      ruletype,
      ruleoutcome,
      ruleconfig
    });
  },

  async getCompetencyDetail(competencyid) {
    return await MoodleApi.call('tool_management_console_get_competency_detail', { competencyid });
  },

  async getCompetencyCourses(competencyid) {
    return await MoodleApi.call('tool_management_console_get_competency_courses', { competencyid });
  },

  async competencyCourseAction({ action, competencyid, courseids, ruleoutcome = 1 }) {
    return await MoodleApi.call('tool_management_console_competency_course_action', {
      action,
      competencyid,
      courseids,
      ruleoutcome
    });
  },

  async moduleCompetencyAction({ action, competencyid, cmid, ruleoutcome = 1 }) {
    return await MoodleApi.call('tool_management_console_module_competency_action', {
      action,
      competencyid,
      cmid,
      ruleoutcome
    });
  },

  async getCompetencyReviews({ page = 0, perpage = 20, frameworkid = 0, competencyid = 0, userid = 0, search = '' } = {}) {
    return await MoodleApi.call('tool_management_console_get_competency_reviews', {
      page,
      perpage,
      frameworkid,
      competencyid,
      userid,
      search
    });
  },

  async competencyReviewAction({ action = 'evaluate', usercompid, grade = 1, proficiency = 1, note = '' }) {
    return await MoodleApi.call('tool_management_console_competency_review_action', {
      action,
      usercompid,
      grade,
      proficiency,
      note
    });
  },

  async getCompetencyUsers(competencyid, { search = '', status = 'all', courseid = 0, page = 0, perpage = 20, sort = 'lastname', dir = 'ASC' } = {}) {
    return await MoodleApi.call('tool_management_console_get_competency_users', {
      competencyid,
      search,
      status,
      courseid,
      page,
      perpage,
      sort,
      dir
    });
  },

  async userPlanAction({ action, userid, competencyid, userids = [] }) {
    const params = {
      action,
      competencyid,
    };
    if (userid !== undefined) {
      params.userid = userid;
    }
    if (userids && userids.length > 0) {
      params.userids = userids;
    }
    return await MoodleApi.call('tool_management_console_user_plan_action', params);
  }
};

export default CompetenciesApi;
