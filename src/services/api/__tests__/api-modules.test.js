import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemApi, CoursesApi, UsersApi, CompetenciesApi, LearningPathsApi } from '../index.js';
import { MoodleApi } from '../../moodle-api.js';

vi.mock('../../moodle-api.js', () => ({
  MoodleApi: {
    call: vi.fn(),
  },
}));

describe('Modular API Submodules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SystemApi', () => {
    it('getDashboard calls tool_management_console_get_dashboard', async () => {
      MoodleApi.call.mockResolvedValue({ courses_total: 10 });
      const res = await SystemApi.getDashboard();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_dashboard');
      expect(res).toEqual({ courses_total: 10 });
    });

    it('getPermissions calls tool_management_console_get_permissions', async () => {
      MoodleApi.call.mockResolvedValue({ is_siteadmin: 1 });
      const res = await SystemApi.getPermissions();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_permissions');
      expect(res).toEqual({ is_siteadmin: 1 });
    });

    it('saveLicense calls tool_management_console_save_license', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      const res = await SystemApi.saveLicense('lic_123');
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_save_license', { key: 'lic_123' });
      expect(res.success).toBe(true);
    });

    it('getAutologinUrl calls tool_management_console_get_autologin_url', async () => {
      MoodleApi.call.mockResolvedValue({ url: 'mock_autologin_token_url' });
      const res = await SystemApi.getAutologinUrl('/course/view.php?id=1');
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_autologin_url', { destination: '/course/view.php?id=1' });
      expect(res.url).toBe('mock_autologin_token_url');
    });
  });

  describe('CoursesApi', () => {
    it('getCourses calls tool_management_console_get_courses with serialized filters', async () => {
      MoodleApi.call.mockResolvedValue({ courses: [], totalcount: 0 });
      await CoursesApi.getCourses({ page: 2, perpage: 10, search: 'science' });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_courses', {
        page: 2,
        perpage: 10,
        sort: 'timecreated',
        dir: 'DESC',
        search: 'science',
        category: 0,
        visibility: -1,
        filters: '{}',
      });
    });

    it('courseAction calls tool_management_console_course_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await CoursesApi.courseAction({ action: 'show', courseids: [5] });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_course_action', {
        action: 'show',
        courseids: [5],
        categoryid: 0,
        fullname: '',
        shortname: '',
        summary: '',
        visible: 1,
        startdate: 0,
        enddate: 0,
      });
    });

    it('getCourseDetail calls tool_management_console_get_course_detail', async () => {
      MoodleApi.call.mockResolvedValue({ id: 5 });
      const res = await CoursesApi.getCourseDetail(5);
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_course_detail', { courseid: 5 });
      expect(res.id).toBe(5);
    });
  });

  describe('UsersApi', () => {
    it('getUsers calls tool_management_console_get_users', async () => {
      MoodleApi.call.mockResolvedValue({ users: [] });
      await UsersApi.getUsers({ page: 1, perpage: 25 });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_users', {
        page: 1,
        perpage: 25,
        sort: 'lastaccess',
        dir: 'DESC',
        search: '',
        filters: '{}',
      });
    });

    it('userAction calls tool_management_console_user_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await UsersApi.userAction({ action: 'suspend', userids: [10, 11] });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_user_action', {
        action: 'suspend',
        userids: [10, 11],
        message_text: '',
      });
    });

    it('cohortAction calls tool_management_console_cohort_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await UsersApi.cohortAction({ action: 'create', name: 'Cohort A' });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_cohort_action', {
        action: 'create',
        cohortid: 0,
        name: 'Cohort A',
        idnumber: '',
        description: '',
      });
    });
  });

  describe('CompetenciesApi', () => {
    it('getScales calls tool_management_console_get_scales', async () => {
      MoodleApi.call.mockResolvedValue([]);
      await CompetenciesApi.getScales();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_scales');
    });

    it('competencyFrameworkAction calls tool_management_console_competency_framework_action', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await CompetenciesApi.competencyFrameworkAction({ action: 'create', shortname: 'FW1' });
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
  });

  describe('LearningPathsApi', () => {
    it('checkLearningPathDependencies calls tool_management_console_check_lp_dependencies', async () => {
      MoodleApi.call.mockResolvedValue({ ok: true });
      const res = await LearningPathsApi.checkLearningPathDependencies();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_check_lp_dependencies');
      expect(res.ok).toBe(true);
    });

    it('getLearningPaths calls tool_management_console_get_learning_paths', async () => {
      MoodleApi.call.mockResolvedValue({ paths: [] });
      await LearningPathsApi.getLearningPaths({ page: 0, perpage: 10 });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_learning_paths', {
        page: 0,
        perpage: 10,
        search: '',
      });
    });

    it('updateLearningPathStructure converts enforce_sequence boolean to integer', async () => {
      MoodleApi.call.mockResolvedValue({ success: true });
      await LearningPathsApi.updateLearningPathStructure(42, { subcourse_course_ids: [1, 2], enforce_sequence: true });
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_update_lp_structure', {
        courseid: 42,
        subcourse_course_ids: [1, 2],
        enforce_sequence: 1,
      });
    });
  });

  describe('AdminerApi unified facade integration & parity', () => {
    it('composes all domain modules with identity reference preservation', async () => {
      const { AdminerApi, ManagementConsoleApi } = await import('../../adminer-api.js');
      expect(ManagementConsoleApi).toBe(AdminerApi);

      const modules = [SystemApi, CoursesApi, UsersApi, CompetenciesApi, LearningPathsApi];
      let totalDomainMethods = 0;

      for (const mod of modules) {
        for (const [name, fn] of Object.entries(mod)) {
          expect(typeof AdminerApi[name]).toBe('function');
          expect(AdminerApi[name]).toBe(fn);
          totalDomainMethods++;
        }
      }

      expect(Object.keys(AdminerApi).length).toBe(totalDomainMethods);
      // Exact count acts as a perimeter detector for public API contract changes.
      expect(totalDomainMethods).toBe(59);
    });

    it('delegates functional calls through facade flawlessly', async () => {
      const { AdminerApi } = await import('../../adminer-api.js');
      MoodleApi.call.mockResolvedValue({ status: 'ok' });

      await AdminerApi.getDashboard();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_dashboard');

      await AdminerApi.getCohortsKpis();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_cohorts_kpis');

      await AdminerApi.getScales();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_get_scales');

      await AdminerApi.checkLearningPathDependencies();
      expect(MoodleApi.call).toHaveBeenCalledWith('tool_management_console_check_lp_dependencies');
    });
  });
});

