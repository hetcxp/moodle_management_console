import React from 'react';
import { FolderTree, Layers, Award } from 'lucide-react';
import { AdminerApi } from '../../services/adminer-api';
import { I18N } from '../../config/i18n';
import { formatDate } from '../../lib/utils';

export const REPORT_CONFIGS = {
  category: {
    title: I18N.reports.category.title,
    description: I18N.reports.category.description,
    emptyTitle: I18N.reports.category.emptyTitle,
    emptyMessage: I18N.reports.category.emptyMessage,
    filename: I18N.reports.category.filename,
    fetchDetail: AdminerApi.getCategoryDetail,
    columns: [
      { label: I18N.reports.category.columns.categoryName, accessor: 'categoria' },
      { label: I18N.reports.category.columns.courseName, accessor: 'curso' },
      { label: I18N.reports.category.columns.courseStatus, accessor: 'estado' },
      { label: I18N.reports.category.columns.enrolled, accessor: 'matriculados' },
      { label: I18N.reports.category.columns.completed, accessor: 'completados' },
      { label: I18N.reports.category.columns.progress, accessor: 'progreso' }
    ],
    processDetail: (detail, csvRows) => {
      if (detail.courses && detail.courses.length > 0) {
        detail.courses.forEach(course => {
          const enrolled = course.enrolledcount || 0;
          const completed = course.completedcount || 0;
          const progress = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

          csvRows.push({
            categoria: detail.name,
            curso: course.fullname,
            estado: course.visible === 1 ? I18N.reports.category.strings.visible : I18N.reports.category.strings.hidden,
            matriculados: enrolled,
            completados: completed,
            progreso: progress
          });
        });
      }
    },
    renderItem: (item) => (
      <div className="flex flex-col">
        <span className="font-semibold text-sm flex items-center gap-2">
          <FolderTree className="h-3.5 w-3.5 text-primary/70" />
          {'\u00A0'.repeat(item.depth * 2)}{item.name}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5 ml-5">
          {item.coursecount} {I18N.reports.cohort.strings.courses} asociados
        </span>
      </div>
    )
  },

  cohort: {
    title: I18N.reports.cohort.title,
    description: I18N.reports.cohort.description,
    emptyTitle: I18N.reports.cohort.emptyTitle,
    emptyMessage: I18N.reports.cohort.emptyMessage,
    filename: I18N.reports.cohort.filename,
    fetchDetail: AdminerApi.getCohortDetail,
    columns: [
      { label: I18N.reports.cohort.columns.cohortName, accessor: 'cohorte' },
      { label: I18N.reports.cohort.columns.cohortCode, accessor: 'codigo' },
      { label: I18N.reports.cohort.columns.userName, accessor: 'usuario' },
      { label: I18N.reports.cohort.columns.email, accessor: 'email' },
      { label: I18N.reports.cohort.columns.userStatus, accessor: 'estado' },
      { label: I18N.reports.cohort.columns.course, accessor: 'curso' },
      { label: I18N.reports.cohort.columns.progress, accessor: 'progreso' }
    ],
    processDetail: (detail, csvRows) => {
      const members = detail.members || [];
      const courses = detail.courses || [];

      const courseMap = {};
      courses.forEach(c => {
        courseMap[c.id] = c.fullname;
      });

      if (members.length === 0) {
        csvRows.push({
          cohorte: detail.name,
          codigo: detail.idnumber,
          usuario: I18N.reports.cohort.strings.noMembers,
          email: '',
          estado: '',
          curso: '',
          progreso: 0
        });
      } else {
        members.forEach(member => {
          const courseProgresses = member.course_progresses || [];

          if (courseProgresses.length === 0) {
            csvRows.push({
              cohorte: detail.name,
              codigo: detail.idnumber,
              usuario: member.fullname,
              email: member.email,
              estado: member.suspended === 0 ? I18N.reports.cohort.strings.active : I18N.reports.cohort.strings.suspended,
              curso: I18N.reports.cohort.strings.noCourses,
              progreso: 0
            });
          } else {
            courseProgresses.forEach(cp => {
              csvRows.push({
                cohorte: detail.name,
                codigo: detail.idnumber,
                usuario: member.fullname,
                email: member.email,
                estado: member.suspended === 0 ? I18N.reports.cohort.strings.active : I18N.reports.cohort.strings.suspended,
                curso: courseMap[cp.courseid] || `Curso ID ${cp.courseid}`,
                progreso: cp.progress
              });
            });
          }
        });
      }
    },
    renderItem: (item) => (
      <div className="flex flex-col">
        <span className="font-semibold text-sm flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-primary/70" />
          {item.name}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5 ml-5">
          {item.memberscount} {I18N.reports.cohort.strings.members} - {item.coursescount} {I18N.reports.cohort.strings.courses}
        </span>
      </div>
    )
  },

  course: {
    title: I18N.reports.course.title,
    description: I18N.reports.course.description,
    emptyTitle: I18N.reports.course.emptyTitle,
    emptyMessage: I18N.reports.course.emptyMessage,
    filename: I18N.reports.course.filename,
    fetchDetail: AdminerApi.getCourseDetail,
    columns: [
      { label: I18N.reports.course.columns.category, accessor: 'categoria' },
      { label: I18N.reports.course.columns.course, accessor: 'curso' },
      { label: I18N.reports.course.columns.user, accessor: 'usuario' },
      { label: I18N.reports.course.columns.role, accessor: 'rol' },
      { label: I18N.reports.course.columns.progress, accessor: 'progreso' },
      { label: I18N.reports.course.columns.status, accessor: 'estado' },
      { label: I18N.reports.course.columns.method, accessor: 'metodo' },
      { label: I18N.reports.course.columns.startDate, accessor: 'fecha_inicio' },
      { label: I18N.reports.course.columns.endDate, accessor: 'fecha_fin' }
    ],
    processDetail: (detail, csvRows) => {
      const courseName = detail.fullname || `Curso ID ${detail.id}`;
      const categoryName = detail.categoryname || I18N.reports.course.strings.unknown;

      if (detail.users && detail.users.length > 0) {
        detail.users.forEach(user => {
          if (!user.enrolments || user.enrolments.length === 0) {
            csvRows.push({
              categoria: categoryName,
              curso: courseName,
              usuario: user.fullname,
              rol: user.roles || 'student',
              progreso: user.progress || 0,
              estado: user.status === 0 ? I18N.reports.course.strings.active : I18N.reports.course.strings.suspended,
              metodo: I18N.reports.course.strings.unknown,
              fecha_inicio: user.timestart > 0 ? formatDate(user.timestart) : '',
              fecha_fin: user.timeend > 0 ? formatDate(user.timeend) : ''
            });
          } else {
            user.enrolments.forEach(enrol => {
              csvRows.push({
                categoria: categoryName,
                curso: courseName,
                usuario: user.fullname,
                rol: user.roles || 'student',
                progreso: user.progress || 0,
                estado: enrol.status === 0 ? I18N.reports.course.strings.active : I18N.reports.course.strings.suspended,
                metodo: enrol.method,
                fecha_inicio: enrol.timestart > 0 ? formatDate(enrol.timestart) : '',
                fecha_fin: enrol.timeend > 0 ? formatDate(enrol.timeend) : ''
              });
            });
          }
        });
      } else {
        csvRows.push({
          categoria: categoryName,
          curso: courseName,
          usuario: I18N.reports.course.strings.noUsers,
          rol: '',
          progreso: 0,
          estado: '',
          metodo: '',
          fecha_inicio: '',
          fecha_fin: ''
        });
      }
    },
    renderItem: (item) => (
      <div className="flex flex-col">
        <span className="font-semibold text-sm">{item.fullname}</span>
        <span className="text-xs text-muted-foreground">{item.categoryname}</span>
      </div>
    )
  },

  user: {
    title: I18N.reports.user.title,
    description: I18N.reports.user.description,
    emptyTitle: I18N.reports.user.emptyTitle,
    emptyMessage: I18N.reports.user.emptyMessage,
    filename: I18N.reports.user.filename,
    fetchDetail: AdminerApi.getUserDetail,
    columns: [
      { label: I18N.reports.user.columns.user, accessor: 'usuario' },
      { label: I18N.reports.user.columns.email, accessor: 'email' },
      { label: I18N.reports.user.columns.course, accessor: 'curso' },
      { label: I18N.reports.user.columns.progress, accessor: 'progreso' },
      { label: I18N.reports.user.columns.method, accessor: 'metodo' },
      { label: I18N.reports.user.columns.status, accessor: 'estado' },
      { label: I18N.reports.user.columns.startDate, accessor: 'fecha_inicio' },
      { label: I18N.reports.user.columns.endDate, accessor: 'fecha_fin' }
    ],
    processDetail: (detail, csvRows) => {
      if (detail.courses && detail.courses.length > 0) {
        detail.courses.forEach(course => {
          if (!course.enrolments || course.enrolments.length === 0) {
            csvRows.push({
              usuario: detail.fullname,
              email: detail.email,
              curso: course.fullname,
              progreso: course.progress || 0,
              metodo: course.enrolmethod || I18N.reports.user.strings.unknownMethod,
              estado: course.enrolstatus === 0 ? I18N.reports.user.strings.active : I18N.reports.user.strings.suspended,
              fecha_inicio: '',
              fecha_fin: ''
            });
          } else {
            course.enrolments.forEach(enrol => {
              csvRows.push({
                usuario: detail.fullname,
                email: detail.email,
                curso: course.fullname,
                progreso: course.progress || 0,
                metodo: enrol.method,
                estado: enrol.status === 0 ? I18N.reports.user.strings.active : I18N.reports.user.strings.suspended,
                fecha_inicio: enrol.timestart > 0 ? formatDate(enrol.timestart) : '',
                fecha_fin: enrol.timeend > 0 ? formatDate(enrol.timeend) : ''
              });
            });
          }
        });
      } else {
        csvRows.push({
          usuario: detail.fullname,
          email: detail.email,
          curso: I18N.reports.user.strings.noCourses,
          progreso: 0,
          metodo: '',
          estado: '',
          fecha_inicio: '',
          fecha_fin: ''
        });
      }
    },
    renderItem: (item) => (
      <div className="flex flex-col">
        <span className="font-semibold text-sm">{item.fullname}</span>
        <span className="text-xs text-muted-foreground">{item.email}</span>
      </div>
    )
  },
  competency: {
    title: I18N.reports.competency.title,
    description: I18N.reports.competency.description,
    emptyTitle: I18N.reports.competency.emptyTitle,
    emptyMessage: I18N.reports.competency.emptyMessage,
    filename: I18N.reports.competency.filename,
    fetchDetail: async (competencyid) => {
      const [competency, coursesData, usersData] = await Promise.all([
        AdminerApi.getCompetencyDetail(competencyid),
        AdminerApi.getCompetencyCourses(competencyid),
        AdminerApi.getCompetencyUsers(competencyid, { perpage: 200 }),
      ]);
      return { competency, coursesData, usersData };
    },
    processDetail: ({ competency, coursesData, usersData }, csvRows) => {
      if (!competency) return;

      const allCourses = [
        ...(coursesData?.courses || []),
        ...(coursesData?.subcompetencycourses || []),
      ];

      const users = usersData?.users || [];

      const STATUS_MAP = {
        0: I18N.reports.competency.strings.statusActive,
        1: I18N.reports.competency.strings.statusWaiting,
        2: I18N.reports.competency.strings.statusInReview,
      };

      if (allCourses.length === 0) {
        csvRows.push({
          marco: competency.frameworkname,
          codigo_marco: competency.frameworkidnumber,
          codigo_competencia: competency.idnumber,
          competencia: competency.shortname,
          curso: I18N.reports.competency.strings.noCourses,
          codigo_curso: '',
          usuario: '',
          email: '',
          estado_comp: '',
          competente: '',
          calificacion_comp: '',
          progreso_curso: '',
          tipo_evidencia: '',
          autor_evidencia: '',
          calificacion_ev: '',
          fecha_evidencia: '',
          nota_evidencia: '',
        });
        return;
      }

      allCourses.forEach((course) => {
        const usersInCourse = users.filter((u) =>
          u.courses && u.courses.some((uc) => uc.courseid === course.id)
        );

        if (usersInCourse.length === 0) {
          csvRows.push({
            marco: competency.frameworkname,
            codigo_marco: competency.frameworkidnumber,
            codigo_competencia: competency.idnumber,
            competencia: competency.shortname,
            curso: course.fullname,
            codigo_curso: course.shortname,
            usuario: I18N.reports.competency.strings.noUsers,
            email: '',
            estado_comp: '',
            competente: '',
            calificacion_comp: '',
            progreso_curso: '',
            tipo_evidencia: '',
            autor_evidencia: '',
            calificacion_ev: '',
            fecha_evidencia: '',
            nota_evidencia: '',
          });
          return;
        }

        usersInCourse.forEach((user) => {
          const courseEntry = user.courses.find((uc) => uc.courseid === course.id);
          const progreso = courseEntry ? courseEntry.progress : 0;
          const competente = user.proficiency === 1 ? I18N.reports.competency.strings.proficientYes : I18N.reports.competency.strings.proficientNo;
          const estadoComp = STATUS_MAP[user.status] || I18N.reports.competency.strings.statusActive;
          const evidences = user.evidences || [];

          if (evidences.length === 0) {
            csvRows.push({
              marco: competency.frameworkname,
              codigo_marco: competency.frameworkidnumber,
              codigo_competencia: competency.idnumber,
              competencia: competency.shortname,
              curso: course.fullname,
              codigo_curso: course.shortname,
              usuario: user.fullname,
              email: user.email,
              estado_comp: estadoComp,
              competente,
              calificacion_comp: user.gradename || '',
              progreso_curso: progreso,
              tipo_evidencia: I18N.reports.competency.strings.noEvidences,
              autor_evidencia: '',
              calificacion_ev: '',
              fecha_evidencia: '',
              nota_evidencia: '',
            });
          } else {
            evidences.forEach((ev) => {
              csvRows.push({
                marco: competency.frameworkname,
                codigo_marco: competency.frameworkidnumber,
                codigo_competencia: competency.idnumber,
                competencia: competency.shortname,
                curso: course.fullname,
                codigo_curso: course.shortname,
                usuario: user.fullname,
                email: user.email,
                estado_comp: estadoComp,
                competente,
                calificacion_comp: user.gradename || '',
                progreso_curso: progreso,
                tipo_evidencia: ev.actionname,
                autor_evidencia: ev.actionuserfullname,
                calificacion_ev: ev.gradename || '',
                fecha_evidencia: ev.timecreated ? formatDate(ev.timecreated) : '',
                nota_evidencia: ev.note || '',
              });
            });
          }
        });
      });
    },
    columns: [
      { label: I18N.reports.competency.columns.framework, accessor: 'marco' },
      { label: I18N.reports.competency.columns.frameworkCode, accessor: 'codigo_marco' },
      { label: I18N.reports.competency.columns.competencyCode, accessor: 'codigo_competencia' },
      { label: I18N.reports.competency.columns.competency, accessor: 'competencia' },
      { label: I18N.reports.competency.columns.course, accessor: 'curso' },
      { label: I18N.reports.competency.columns.courseCode, accessor: 'codigo_curso' },
      { label: I18N.reports.competency.columns.user, accessor: 'usuario' },
      { label: I18N.reports.competency.columns.email, accessor: 'email' },
      { label: I18N.reports.competency.columns.competencyStatus, accessor: 'estado_comp' },
      { label: I18N.reports.competency.columns.proficient, accessor: 'competente' },
      { label: I18N.reports.competency.columns.grade, accessor: 'calificacion_comp' },
      { label: I18N.reports.competency.columns.courseProgress, accessor: 'progreso_curso' },
      { label: I18N.reports.competency.columns.evidenceType, accessor: 'tipo_evidencia' },
      { label: I18N.reports.competency.columns.evidenceAuthor, accessor: 'autor_evidencia' },
      { label: I18N.reports.competency.columns.evidenceGrade, accessor: 'calificacion_ev' },
      { label: I18N.reports.competency.columns.evidenceDate, accessor: 'fecha_evidencia' },
      { label: I18N.reports.competency.columns.evidenceNote, accessor: 'nota_evidencia' },
    ],
    renderItem: (item) => (
      <div className="flex flex-col">
        <span className="font-semibold text-sm flex items-center gap-2">
          <Award className="h-3.5 w-3.5 text-primary/70" />
          {item.shortname}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5 ml-5">
          {item.idnumber && `${item.idnumber} · `}{item.frameworkname}
        </span>
      </div>
    )
  }
};
