import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminerApi, ManagementConsoleApi } from '../adminer-api.js';
import { MoodleApi } from '../moodle-api.js';

vi.mock('../moodle-api.js', () => ({
  MoodleApi: {
    call: vi.fn(),
  },
}));

describe('AdminerApi service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports ManagementConsoleApi as alias of AdminerApi', () => {
    expect(ManagementConsoleApi).toBe(AdminerApi);
  });

  describe('Dashboard & Permissions', () => {
    it('getDashboard calls tool_management_console_get_dashboard', async () => {
      MoodleApi.call.mockResolvedValue({ courses_total: 10 });
      const res = await AdminerApi.getDashboard();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_dashboard');
      expect(res).toEqual({ courses_total: 10 });
    });

    it('getPermissions calls tool_management_console_get_permissions', async () => {
      MoodleApi.call.mockResolvedValue({ is_siteadmin: 1 });
      const res = await AdminerApi.getPermissions();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_permissions');
      expect(res).toEqual({ is_siteadmin: 1 });
    });
  });

  describe('Courses operations', () => {
    it('getCourses serializes filters to JSON and sets defaults', async () => {
      MoodleApi.call.mockResolvedValue({ courses: [], totalcount: 0 });
      await AdminerApi.getCourses({ page: 1, perpage: 15, search: 'math', filters: { category: 2 } });
      
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_courses', {
        page: 1,
        perpage: 15,
        sort: 'timecreated',
        dir: 'DESC',
        search: 'math',
        category: 0,
        visibility: -1,
        filters: JSON.stringify({ category: 2 }),
      });
    });

    it('courseAction passes action parameters correctly', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.courseAction({
        action: 'hide',
        courseids: [101, 102],
        categoryid: 5,
        fullname: 'Nuevo Curso',
      });

      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_course_action', {
        action: 'hide',
        courseids: [101, 102],
        categoryid: 5,
        fullname: 'Nuevo Curso',
        shortname: '',
        summary: '',
        visible: 1,
        startdate: 0,
        enddate: 0,
      });
    });

    it('getCourseDetail calls tool_management_console_get_course_detail', async () => {
      MoodleApi.call.mockResolvedValue({ id: 10, fullname: 'Course 10' });
      const res = await AdminerApi.getCourseDetail(10);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_course_detail', { courseid: 10 });
      expect(res.id).toBe(10);
    });

    it('getCourseUserDetail calls tool_management_console_get_course_user_detail', async () => {
      MoodleApi.call.mockResolvedValue({ activities: [] });
      await AdminerApi.getCourseUserDetail(10, 25);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_course_user_detail', {
        courseid: 10,
        userid: 25,
      });
    });

    it('getCourseAvailableActivities calls tool_management_console_get_course_available_activities', async () => {
      MoodleApi.call.mockResolvedValue([]);
      await AdminerApi.getCourseAvailableActivities(10, 5);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_course_available_activities', {
        courseid: 10,
        competencyid: 5,
      });
    });

    it('uploadCoursesCsv passes file content', async () => {
      MoodleApi.call.mockResolvedValue({ imported: 5 });
      await AdminerApi.uploadCoursesCsv('shortname,fullname\nC1,Course 1');
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_upload_courses_csv', {
        fileContent: 'shortname,fullname\nC1,Course 1',
      });
    });

    it('courseCohortAction passes action and options', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.courseCohortAction('enrol', 10, [1, 2], { groupid: 3, roleid: 5 });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_course_cohort_action', {
        action: 'enrol',
        courseid: 10,
        cohortids: [1, 2],
        groupid: 3,
        newgroupname: '',
        timeend: 0,
        message_text: '',
        roleid: 5,
      });
    });

    it('courseUserAction passes parameters', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.courseUserAction('unenrol', 10, [50, 51]);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_course_user_action', {
        action: 'unenrol',
        courseid: 10,
        userids: [50, 51],
        timeend: 0,
        groupid: 0,
        newgroupname: '',
        message_text: '',
      });
    });
  });

  describe('Categories operations', () => {
    it('getCategories calls tool_management_console_get_categories', async () => {
      MoodleApi.call.mockResolvedValue({ categories: [] });
      await AdminerApi.getCategories({ page: 0, perpage: 50 });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_categories', {
        page: 0,
        perpage: 50,
      });
    });

    it('getCategoriesFlat calls tool_management_console_get_categories_flat', async () => {
      MoodleApi.call.mockResolvedValue([]);
      await AdminerApi.getCategoriesFlat();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_categories_flat');
    });

    it('categoryAction calls tool_management_console_category_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.categoryAction({ action: 'delete', categoryids: [2, 3] });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_category_action', {
        action: 'delete',
        categoryids: [2, 3],
        categoryid: 0,
        name: '',
        parent: 0,
        description: '',
      });
    });

    it('getCategoryDetail calls tool_management_console_get_category_detail', async () => {
      MoodleApi.call.mockResolvedValue({ id: 2 });
      await AdminerApi.getCategoryDetail(2);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_category_detail', {
        categoryid: 2,
      });
    });
  });

  describe('Users operations', () => {
    it('getUsers serializes filters to JSON', async () => {
      MoodleApi.call.mockResolvedValue({ users: [], totalcount: 0 });
      await AdminerApi.getUsers({ page: 2, perpage: 25, filters: { status: 'active' } });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_users', {
        page: 2,
        perpage: 25,
        sort: 'lastaccess',
        dir: 'DESC',
        search: '',
        filters: JSON.stringify({ status: 'active' }),
      });
    });

    it('getUsersKpis calls tool_management_console_get_users_kpis', async () => {
      MoodleApi.call.mockResolvedValue({ total: 100 });
      await AdminerApi.getUsersKpis();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_users_kpis');
    });

    it('userAction calls tool_management_console_user_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.userAction({ action: 'suspend', userids: [5, 6], message_text: 'note' });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_user_action', {
        action: 'suspend',
        userids: [5, 6],
        message_text: 'note',
      });
    });

    it('addUser calls tool_management_console_add_user', async () => {
      MoodleApi.call.mockResolvedValue({ id: 50 });
      await AdminerApi.addUser({ username: 'ana', email: 'ana@example.com' });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_add_user', {
        username: 'ana',
        email: 'ana@example.com',
      });
    });

    it('uploadUsersCsv calls tool_management_console_upload_users_csv', async () => {
      MoodleApi.call.mockResolvedValue({ created: 3 });
      await AdminerApi.uploadUsersCsv('username,email\nu1,u1@test.com');
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_upload_users_csv', {
        fileContent: 'username,email\nu1,u1@test.com',
      });
    });

    it('getUserDetail calls tool_management_console_get_user_detail', async () => {
      MoodleApi.call.mockResolvedValue({ id: 15 });
      await AdminerApi.getUserDetail(15);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_user_detail', {
        userid: 15,
      });
    });

    it('userCohortAction calls tool_management_console_user_cohort_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.userCohortAction('add', 15, [1, 2]);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_user_cohort_action', {
        action: 'add',
        userid: 15,
        cohortids: [1, 2],
      });
    });

    it('userCourseAction calls tool_management_console_user_course_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.userCourseAction('enrol', 15, [101], { roleid: 5 });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_user_course_action', {
        action: 'enrol',
        userid: 15,
        courseids: [101],
        roleid: 5,
      });
    });

    it('getAutologinUrl calls tool_management_console_get_autologin_url', async () => {
      MoodleApi.call.mockResolvedValue({ url: 'http://example.com' });
      await AdminerApi.getAutologinUrl(15);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_autologin_url', {
        destination: 15,
      });
    });
  });

  describe('Cohorts operations', () => {
    it('getCohortsKpis calls tool_management_console_get_cohorts_kpis', async () => {
      MoodleApi.call.mockResolvedValue({ total: 5 });
      await AdminerApi.getCohortsKpis();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_cohorts_kpis');
    });

    it('getCohorts calls tool_management_console_get_cohorts', async () => {
      MoodleApi.call.mockResolvedValue({ cohorts: [] });
      await AdminerApi.getCohorts({ page: 0, perpage: 20 });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_cohorts', {
        page: 0,
        perpage: 20,
        sort: 'name',
        dir: 'ASC',
        search: '',
        filters: JSON.stringify({}),
      });
    });

    it('cohortAction calls tool_management_console_cohort_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.cohortAction({ action: 'delete', cohortid: 1 });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_cohort_action', {
        action: 'delete',
        cohortid: 1,
        name: '',
        idnumber: '',
        description: '',
      });
    });

    it('getCohortDetail calls tool_management_console_get_cohort_detail', async () => {
      MoodleApi.call.mockResolvedValue({ id: 10 });
      await AdminerApi.getCohortDetail(10);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_cohort_detail', {
        cohortid: 10,
      });
    });
  });

  describe('Competencies operations', () => {
    it('getScales calls tool_management_console_get_scales', async () => {
      MoodleApi.call.mockResolvedValue([]);
      await AdminerApi.getScales();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_scales');
    });

    it('getCompetencyKpis calls tool_management_console_get_competency_kpis', async () => {
      MoodleApi.call.mockResolvedValue({});
      await AdminerApi.getCompetencyKpis();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_competency_kpis');
    });

    it('getCompetencyFrameworks calls tool_management_console_get_competency_frameworks', async () => {
      MoodleApi.call.mockResolvedValue([]);
      await AdminerApi.getCompetencyFrameworks();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_competency_frameworks', {
        page: 0,
        perpage: 50,
        sort: 'shortname',
        dir: 'ASC',
        search: '',
        filters: JSON.stringify({}),
      });
    });

    it('competencyFrameworkAction calls tool_management_console_competency_framework_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.competencyFrameworkAction({ action: 'create', shortname: 'FW1' });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_competency_framework_action', {
        action: 'create',
        frameworkid: 0,
        shortname: 'FW1',
        idnumber: '',
        description: '',
        scaleid: 0,
        visible: 1,
      });
    });

    it('getCompetencyFrameworkDetail calls tool_management_console_get_competency_framework_detail', async () => {
      MoodleApi.call.mockResolvedValue({ id: 1 });
      await AdminerApi.getCompetencyFrameworkDetail(1, 'query');
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_competency_framework_detail', {
        frameworkid: 1,
        search: 'query',
      });
    });

    it('getCompetencyDetail calls tool_management_console_get_competency_detail', async () => {
      MoodleApi.call.mockResolvedValue({ id: 5 });
      await AdminerApi.getCompetencyDetail(5);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_competency_detail', {
        competencyid: 5,
      });
    });

    it('competencyAction calls tool_management_console_competency_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.competencyAction({ action: 'delete', competencyid: 5 });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_competency_action', {
        action: 'delete',
        competencyid: 5,
        frameworkid: 0,
        parentid: 0,
        shortname: '',
        idnumber: '',
        description: '',
        ruletype: '',
        ruleoutcome: 1,
        ruleconfig: '',
      });
    });

    it('getCompetencyCourses calls tool_management_console_get_competency_courses', async () => {
      MoodleApi.call.mockResolvedValue([]);
      await AdminerApi.getCompetencyCourses(5);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_competency_courses', {
        competencyid: 5,
      });
    });

    it('competencyCourseAction calls tool_management_console_competency_course_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.competencyCourseAction({ action: 'add', competencyid: 5, courseids: [10, 20] });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_competency_course_action', {
        action: 'add',
        competencyid: 5,
        courseids: [10, 20],
        ruleoutcome: 1,
      });
    });

    it('moduleCompetencyAction calls tool_management_console_module_competency_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.moduleCompetencyAction({ action: 'link', competencyid: 5, cmid: 99 });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_module_competency_action', {
        action: 'link',
        competencyid: 5,
        cmid: 99,
        ruleoutcome: 1,
      });
    });

    it('getCompetencyUsers calls tool_management_console_get_competency_users', async () => {
      MoodleApi.call.mockResolvedValue({ users: [] });
      await AdminerApi.getCompetencyUsers(5, { page: 0, perpage: 20 });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_competency_users', {
        competencyid: 5,
        page: 0,
        perpage: 20,
        search: '',
        status: 'all',
        courseid: 0,
        sort: 'lastname',
        dir: 'ASC',
      });
    });

    it('getCompetencyReviews calls tool_management_console_get_competency_reviews', async () => {
      MoodleApi.call.mockResolvedValue({ reviews: [] });
      await AdminerApi.getCompetencyReviews({ competencyid: 5, page: 0, perpage: 20 });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_competency_reviews', {
        competencyid: 5,
        frameworkid: 0,
        userid: 0,
        page: 0,
        perpage: 20,
        search: '',
      });
    });

    it('competencyReviewAction calls tool_management_console_competency_review_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await AdminerApi.competencyReviewAction({ usercompid: 8, action: 'evaluate', grade: 2, proficiency: 1, note: 'bien' });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_competency_review_action', {
        usercompid: 8,
        action: 'evaluate',
        grade: 2,
        proficiency: 1,
        note: 'bien',
      });
    });
  });
});
