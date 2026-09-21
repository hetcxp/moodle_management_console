import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { CompetencyReportModal } from '../views/reports/CompetencyReportModal';
import { REPORT_CONFIGS } from '../views/reports/reportConfigs';
import { AdminerApi } from '../services/adminer-api';

vi.mock('../services/adminer-api', () => import('./__mocks__/adminer-api'));

describe('CompetencyReportModal and REPORT_CONFIGS.competency', () => {
  it('renders CompetencyReportModal when open', () => {
    renderWithProviders(<CompetencyReportModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Reporte Detallado de Competencias')).toBeDefined();
    expect(screen.getByText('Todos los marcos')).toBeDefined();
  });

  describe('processDetail', () => {
    const config = REPORT_CONFIGS.competency;

    it('handles empty competency safely', () => {
      const rows = [];
      config.processDetail({ competency: null }, rows);
      expect(rows.length).toBe(0);
    });

    it('handles competency without courses', () => {
      const rows = [];
      config.processDetail({
        competency: {
          id: 10,
          frameworkname: 'Marco 1',
          frameworkidnumber: 'FW1',
          idnumber: 'COMP1',
          shortname: 'Competencia 1',
        },
        coursesData: { courses: [], subcompetencycourses: [] },
        usersData: { users: [] },
      }, rows);

      expect(rows.length).toBe(1);
      expect(rows[0].competencia).toBe('Competencia 1');
      expect(rows[0].curso).toBe('Sin cursos vinculados');
    });

    it('handles courses with no enrolled users', () => {
      const rows = [];
      config.processDetail({
        competency: {
          id: 10,
          frameworkname: 'Marco 1',
          frameworkidnumber: 'FW1',
          idnumber: 'COMP1',
          shortname: 'Competencia 1',
        },
        coursesData: { courses: [{ id: 101, fullname: 'Curso Demo', shortname: 'CD' }] },
        usersData: { users: [] },
      }, rows);

      expect(rows.length).toBe(1);
      expect(rows[0].curso).toBe('Curso Demo');
      expect(rows[0].usuario).toBe('Sin usuarios matriculados');
    });

    it('handles user without evidences', () => {
      const rows = [];
      config.processDetail({
        competency: {
          id: 10,
          frameworkname: 'Marco 1',
          frameworkidnumber: 'FW1',
          idnumber: 'COMP1',
          shortname: 'Competencia 1',
        },
        coursesData: { courses: [{ id: 101, fullname: 'Curso Demo', shortname: 'CD' }] },
        usersData: {
          users: [
            {
              id: 201,
              fullname: 'Estudiante Uno',
              email: 'est@test.com',
              proficiency: 1,
              status: 0,
              courses: [{ courseid: 101, progress: 85 }],
              evidences: [],
            },
          ],
        },
      }, rows);

      expect(rows.length).toBe(1);
      expect(rows[0].usuario).toBe('Estudiante Uno');
      expect(rows[0].competente).toBe('Sí');
      expect(rows[0].tipo_evidencia).toBe('Sin evidencias registradas');
    });

    it('handles user with multiple evidences', () => {
      const rows = [];
      config.processDetail({
        competency: {
          id: 10,
          frameworkname: 'Marco 1',
          frameworkidnumber: 'FW1',
          idnumber: 'COMP1',
          shortname: 'Competencia 1',
        },
        coursesData: { courses: [{ id: 101, fullname: 'Curso Demo', shortname: 'CD' }] },
        usersData: {
          users: [
            {
              id: 201,
              fullname: 'Estudiante Uno',
              email: 'est@test.com',
              proficiency: 0,
              status: 1,
              courses: [{ courseid: 101, progress: 40 }],
              evidences: [
                {
                  actionname: 'Tarea enviada',
                  actionuserfullname: 'Docente Dos',
                  gradename: 'Aprobado',
                  timecreated: 1710000000,
                  note: 'Buen trabajo',
                },
              ],
            },
          ],
        },
      }, rows);

      expect(rows.length).toBe(1);
      expect(rows[0].usuario).toBe('Estudiante Uno');
      expect(rows[0].competente).toBe('No');
      expect(rows[0].estado_comp).toBe('Pendiente');
      expect(rows[0].tipo_evidencia).toBe('Tarea enviada');
      expect(rows[0].autor_evidencia).toBe('Docente Dos');
      expect(rows[0].nota_evidencia).toBe('Buen trabajo');
    });
  });

  describe('fetchDetail', () => {
    it('calls getCompetencyDetail, getCompetencyCourses and getCompetencyUsers with perpage=200', async () => {
      const result = await REPORT_CONFIGS.competency.fetchDetail(5);
      expect(AdminerApi.getCompetencyDetail).toHaveBeenCalledWith(5);
      expect(AdminerApi.getCompetencyCourses).toHaveBeenCalledWith(5);
      expect(AdminerApi.getCompetencyUsers).toHaveBeenCalledWith(5, { perpage: 200 });
      expect(result).toHaveProperty('competency');
      expect(result).toHaveProperty('coursesData');
      expect(result).toHaveProperty('usersData');
    });
  });
});
